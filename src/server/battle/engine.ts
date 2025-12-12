// Battle engine with pure functions for damage calculation and turn resolution

export interface AttackerStats {
  strength: number;
  vitality: number;
}

export interface DefenderStats {
  vitality: number;
}

export interface BattleState {
  playerHp: number;
  playerSp: number;
  monsterHp: number;
  turnNumber: number;
}

export interface MonsterTemplate {
  id: string;
  name: string;
  level: number;
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
  maxHp: number;
}

export interface PlayerStats {
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
  currentHp: number;
  currentSp: number;
  maxHp: number;
  maxSp: number;
}

export interface BattleEvent {
  message: string;
  turnNumber: number;
}

/**
 * Calculate damage dealt by attacker to defender
 * Formula: max(1, attackerStr - floor(defenderVit/2) + rand(0..2))
 */
export function calcDamage(
  attackerStats: AttackerStats,
  defenderStats: DefenderStats
): number {
  const baseDamage = attackerStats.strength;
  const defense = Math.floor(defenderStats.vitality / 2);
  const randomBonus = Math.floor(Math.random() * 3); // 0, 1, or 2
  const damage = Math.max(1, baseDamage - defense + randomBonus);
  return damage;
}

/**
 * Resolve one full turn: player attack -> monster attack
 * Returns updated battle state and events
 */
export function resolveAttackTurn(
  battleState: BattleState,
  playerStats: PlayerStats,
  monsterTemplate: MonsterTemplate
): {
  updatedState: BattleState;
  events: BattleEvent[];
} {
  const events: BattleEvent[] = [];
  let { playerHp, playerSp, monsterHp, turnNumber } = battleState;

  // Player attacks monster
  const playerDamage = calcDamage(
    { strength: playerStats.strength, vitality: playerStats.vitality },
    { vitality: monsterTemplate.vitality }
  );
  monsterHp = Math.max(0, monsterHp - playerDamage);
  events.push({
    message: `You attack ${monsterTemplate.name} for ${playerDamage} damage!`,
    turnNumber,
  });

  // Check if monster is defeated
  if (monsterHp <= 0) {
    events.push({
      message: `You defeated ${monsterTemplate.name}!`,
      turnNumber,
    });
    return {
      updatedState: {
        playerHp,
        playerSp,
        monsterHp: 0,
        turnNumber: turnNumber + 1,
      },
      events,
    };
  }

  // Monster attacks player
  const monsterDamage = calcDamage(
    { strength: monsterTemplate.strength, vitality: monsterTemplate.vitality },
    { vitality: playerStats.vitality }
  );
  playerHp = Math.max(0, playerHp - monsterDamage);
  events.push({
    message: `${monsterTemplate.name} attacks you for ${monsterDamage} damage!`,
    turnNumber,
  });

  // Check if player is defeated
  if (playerHp <= 0) {
    events.push({
      message: `You have been defeated by ${monsterTemplate.name}!`,
      turnNumber,
    });
  }

  return {
    updatedState: {
      playerHp,
      playerSp,
      monsterHp,
      turnNumber: turnNumber + 1,
    },
    events,
  };
}
