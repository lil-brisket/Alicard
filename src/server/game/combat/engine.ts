// Combat engine - pure domain logic for combat calculations
// No database access, no side effects - only calculations

import type {
  CombatStats,
  EnemyStats,
  CombatState,
  CombatActionResult,
  CombatAction,
  Equipment,
  PlayerBaseStats,
} from "./types";

/**
 * Calculate player combat stats including equipment bonuses
 */
export function calculateCombatStats(
  stats: PlayerBaseStats,
  equipment: Equipment | null | undefined
): CombatStats {
  let vitality = stats.vitality;
  let strength = stats.strength;
  let speed = stats.speed;
  let dexterity = stats.dexterity;
  let defense = Math.floor(vitality * 0.5);

  // Add equipment bonuses
  if (equipment) {
    const equipmentItems = [
      equipment.head,
      equipment.leftArm,
      equipment.rightArm,
      equipment.body,
      equipment.legs,
      equipment.feet,
      equipment.ring1,
      equipment.ring2,
      equipment.ring3,
      equipment.necklace,
      equipment.belt,
      equipment.cloak,
    ].filter(Boolean) as Array<NonNullable<Equipment[keyof Equipment]>>;

    for (const item of equipmentItems) {
      vitality += item.vitalityBonus ?? 0;
      strength += item.strengthBonus ?? 0;
      speed += item.speedBonus ?? 0;
      dexterity += item.dexterityBonus ?? 0;
      defense += Math.floor((item.vitalityBonus ?? 0) * 0.5);
      defense += item.defenseBonus ?? 0;
    }
  }

  return {
    vitality,
    strength,
    speed,
    dexterity,
    defense,
    currentHP: stats.currentHP,
    maxHP: 50 + vitality * 5,
    currentSP: stats.currentSP,
    maxSP: 20 + vitality * 2 + speed * 1,
  };
}

/**
 * Calculate enemy stats based on type and level
 */
export function calculateEnemyStats(enemyType: string, level: number): EnemyStats {
  const baseStats: Record<
    string,
    { hp: number; strength: number; speed: number; defense: number }
  > = {
    Wolf: { hp: 20, strength: 5, speed: 8, defense: 2 },
    Goblin: { hp: 15, strength: 4, speed: 6, defense: 1 },
    Bandit: { hp: 25, strength: 6, speed: 5, defense: 3 },
    Skeleton: { hp: 30, strength: 7, speed: 4, defense: 4 },
    Orc: { hp: 40, strength: 10, speed: 3, defense: 5 },
  };

  const base = baseStats[enemyType] ?? baseStats["Wolf"]!;
  const multiplier = 1 + (level - 1) * 0.3;

  const hp = Math.floor(base.hp * multiplier);

  return {
    hp,
    maxHP: hp,
    strength: Math.floor(base.strength * multiplier),
    speed: Math.floor(base.speed * multiplier),
    defense: Math.floor(base.defense * multiplier),
    type: enemyType,
    level,
  };
}

/**
 * Calculate damage dealt by attacker to defender
 */
export function calculateDamage(attack: number, defense: number): number {
  const baseDamage = attack;
  const mitigated = Math.floor(defense * 0.5);
  const damage = Math.max(1, baseDamage - mitigated);
  // Add some randomness (±20%)
  const variance = damage * 0.2;
  return Math.floor(damage + Math.random() * variance * 2 - variance);
}

/**
 * Calculate escape chance based on speed difference
 */
export function calculateEscapeChance(
  playerSpeed: number,
  enemySpeed: number
): number {
  const speedDiff = playerSpeed - enemySpeed;
  const baseChance = 0.3;
  const speedBonus = Math.min(0.4, speedDiff * 0.05);
  return Math.min(0.9, baseChance + speedBonus);
}

/**
 * Determine turn order (player goes first if speed >= enemy speed)
 */
export function determineTurnOrder(playerSpeed: number, enemySpeed: number): boolean {
  return playerSpeed >= enemySpeed;
}

/**
 * Execute a combat action and return the result
 * Pure function - no side effects, only calculations
 */
export function executeCombatAction(
  action: CombatAction,
  state: CombatState,
  playerStats: CombatStats,
  enemyStats: EnemyStats,
  skillName?: string,
  skillStaminaCost?: number
): CombatActionResult {
  const messages: string[] = [];
  let { playerHP, playerSP, enemyHP, turnNumber } = state;
  let combatEnded = false;
  let playerWon: boolean | null = null;

  // Player action
  switch (action) {
    case "attack": {
      const damage = calculateDamage(playerStats.strength, enemyStats.defense);
      enemyHP = Math.max(0, enemyHP - damage);
      messages.push(
        `You attack the ${enemyStats.type} for ${damage} damage!`
      );
      if (enemyHP <= 0) {
        combatEnded = true;
        playerWon = true;
        messages.push(`You defeated the ${enemyStats.type}!`);
      }
      break;
    }
    case "defend": {
      // Defend reduces incoming damage by 50% for this turn
      messages.push("You take a defensive stance!");
      break;
    }
    case "skill": {
      if (!skillName || skillStaminaCost === undefined) {
        throw new Error("Skill name and stamina cost required for skill action");
      }
      if (playerSP < skillStaminaCost) {
        throw new Error("Not enough stamina");
      }
      playerSP -= skillStaminaCost;
      
      // Basic skill implementation - Power Strike
      if (skillName === "Power Strike") {
        const damage = calculateDamage(
          playerStats.strength * 1.5,
          enemyStats.defense
        );
        enemyHP = Math.max(0, enemyHP - damage);
        messages.push(
          `You use Power Strike for ${damage} damage! (SP: ${playerSP}/${playerStats.maxSP})`
        );
        if (enemyHP <= 0) {
          combatEnded = true;
          playerWon = true;
          messages.push(`You defeated the ${enemyStats.type}!`);
        }
      } else {
        throw new Error(`Unknown skill: ${skillName}`);
      }
      break;
    }
    case "escape": {
      const escapeChance = calculateEscapeChance(
        playerStats.speed,
        enemyStats.speed
      );
      if (Math.random() < escapeChance) {
        combatEnded = true;
        playerWon = null; // Escape is neither win nor loss
        messages.push("You successfully escaped!");
      } else {
        messages.push("You failed to escape!");
      }
      break;
    }
    case "item": {
      // Item usage would be implemented here
      messages.push("Item usage not yet implemented");
      break;
    }
  }

  // Enemy action (if combat not ended)
  if (!combatEnded) {
    const enemyDamage = calculateDamage(enemyStats.strength, playerStats.defense);
    playerHP = Math.max(0, playerHP - enemyDamage);
    messages.push(
      `The ${enemyStats.type} attacks you for ${enemyDamage} damage! (HP: ${playerHP}/${playerStats.maxHP})`
    );

    if (playerHP <= 0) {
      combatEnded = true;
      playerWon = false;
      messages.push("You have been defeated!");
    }
  }

  return {
    state: {
      playerHP,
      playerSP,
      enemyHP,
      turnNumber: turnNumber + 1,
      combatEnded,
      playerWon,
    },
    messages,
  };
}

