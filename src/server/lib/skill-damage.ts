/**
 * Skill damage calculation helper
 * Deterministic damage calculation for skills
 * 
 * Formula: (basePower + (scalingStat * scalingRatio) + flatBonus) * hits
 * 
 * TODO: Extend later for:
 * - Crit chance/variance
 * - Defense mitigation
 * - Elemental resistances
 * - Status effect damage
 */

export type AttackerStats = {
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
};

export type TargetStats = {
  vitality: number;
  defense?: number;
};

export type SkillDamageInput = {
  basePower: number | null;
  scalingStat: "VITALITY" | "STRENGTH" | "SPEED" | "DEXTERITY" | null;
  scalingRatio: number;
  flatBonus: number;
  hits: number;
};

type StatKey = "vitality" | "strength" | "speed" | "dexterity";

/**
 * Calculate skill damage per hit
 */
export function calculateSkillDamagePerHit(
  skill: SkillDamageInput,
  attackerStats: AttackerStats
): number {
  let damage = skill.basePower ?? 0;

  // Add scaling component
  if (skill.scalingStat) {
    const statKey = skill.scalingStat.toLowerCase() as StatKey;
    const statValue = attackerStats[statKey] ?? 0;
    damage += statValue * skill.scalingRatio;
  }

  // Add flat bonus
  damage += skill.flatBonus;

  // Ensure non-negative
  return Math.max(0, Math.floor(damage));
}

/**
 * Calculate total damage (per hit * hits)
 */
export function calculateSkillTotalDamage(
  skill: SkillDamageInput,
  attackerStats: AttackerStats
): number {
  const perHit = calculateSkillDamagePerHit(skill, attackerStats);
  return perHit * skill.hits;
}

/**
 * Calculate damage per turn (DPT) approximation
 * Accounts for cooldown
 */
export function calculateDamagePerTurn(
  skill: SkillDamageInput,
  attackerStats: AttackerStats,
  cooldownTurns: number
): number {
  const totalDamage = calculateSkillTotalDamage(skill, attackerStats);
  const effectiveCooldown = Math.max(1, cooldownTurns + 1); // +1 for the turn used
  return totalDamage / effectiveCooldown;
}

/**
 * Calculate damage per SP (stamina point)
 */
export function calculateDamagePerSP(
  skill: SkillDamageInput,
  attackerStats: AttackerStats,
  spCost: number
): number {
  if (spCost === 0) return 0;
  const totalDamage = calculateSkillTotalDamage(skill, attackerStats);
  return totalDamage / spCost;
}

