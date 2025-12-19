/**
 * Melvor Idle-inspired skill training XP and leveling utilities
 * 
 * Uses exponential XP curves similar to Melvor Idle
 * Formula: XP for level N = floor(base^(N-1) * baseXP)
 * Where baseXP is typically around 100-200 and base is ~1.15
 */

/**
 * Calculate total XP required to reach a specific level
 * Melvor-style exponential curve
 * 
 * @param level - Target level
 * @param baseXP - Base XP amount (e.g., 100)
 * @param curveBase - Exponential curve base (default 1.15, Melvor-like)
 * @returns Total XP needed to reach that level
 */
export function getXpForSkillLevel(
  level: number,
  baseXP: number = 100,
  curveBase: number = 1.15
): number {
  if (level <= 1) return 0;
  if (level === 2) return baseXP;
  
  // Exponential curve: sum of XP for each level from 1 to target
  let totalXp = 0;
  for (let i = 2; i <= level; i++) {
    const xpForThisLevel = Math.floor(Math.pow(curveBase, i - 2) * baseXP);
    totalXp += xpForThisLevel;
  }
  
  return totalXp;
}

/**
 * Calculate level from total XP
 * 
 * @param totalXp - Total accumulated XP
 * @param maxLevel - Maximum level cap (default 99)
 * @param baseXP - Base XP amount (e.g., 100)
 * @param curveBase - Exponential curve base (default 1.15)
 * @returns Current level (1 to maxLevel)
 */
export function getLevelFromSkillXp(
  totalXp: number,
  maxLevel: number = 99,
  baseXP: number = 100,
  curveBase: number = 1.15
): number {
  if (totalXp <= 0) return 1;
  
  let level = 1;
  let accumulatedXp = 0;
  
  while (level < maxLevel) {
    const xpNeededForNext = getXpForSkillLevel(level + 1, baseXP, curveBase) - accumulatedXp;
    if (accumulatedXp + xpNeededForNext > totalXp) {
      break;
    }
    accumulatedXp += xpNeededForNext;
    level++;
  }
  
  return level;
}

/**
 * Get XP progress for current level
 * 
 * @param level - Current level
 * @param totalXp - Total accumulated XP
 * @param baseXP - Base XP amount
 * @param curveBase - Exponential curve base
 * @returns Object with current XP in level and XP needed for next level
 */
export function getSkillXpProgress(
  level: number,
  totalXp: number,
  baseXP: number = 100,
  curveBase: number = 1.15
): { current: number; needed: number; progressPct: number } {
  const xpAtLevelStart = getXpForSkillLevel(level, baseXP, curveBase);
  const xpAtNextLevel = getXpForSkillLevel(level + 1, baseXP, curveBase);
  const xpNeededForNext = xpAtNextLevel - xpAtLevelStart;
  const currentXpInLevel = Math.max(0, totalXp - xpAtLevelStart);
  
  return {
    current: currentXpInLevel,
    needed: xpNeededForNext,
    progressPct: xpNeededForNext > 0 ? (currentXpInLevel / xpNeededForNext) * 100 : 100,
  };
}

/**
 * Add XP to a skill and return updated level
 * Melvor-style: XP is granted per action, not per second
 * 
 * @param currentLevel - Current skill level
 * @param currentXp - Current total XP
 * @param xpDelta - XP to add (must be >= 0)
 * @param maxLevel - Maximum level cap
 * @param baseXP - Base XP amount
 * @param curveBase - Exponential curve base
 * @returns Object with new level, new XP, leveled up flag, and progress info
 */
export function addSkillXp(
  currentLevel: number,
  currentXp: number,
  xpDelta: number,
  maxLevel: number = 99,
  baseXP: number = 100,
  curveBase: number = 1.15
): {
  newLevel: number;
  newXp: number;
  leveledUp: boolean;
  xpInLevel: number;
  xpToNext: number;
  progressPct: number;
} {
  if (xpDelta < 0) {
    throw new Error(`Cannot add negative XP: ${xpDelta}`);
  }

  const oldLevel = getLevelFromSkillXp(currentXp, maxLevel, baseXP, curveBase);
  const maxPossibleXp = getXpForSkillLevel(maxLevel, baseXP, curveBase);
  const newXp = Math.min(currentXp + xpDelta, maxPossibleXp);
  const newLevel = getLevelFromSkillXp(newXp, maxLevel, baseXP, curveBase);
  const leveledUp = newLevel > oldLevel;

  const progress = getSkillXpProgress(newLevel, newXp, baseXP, curveBase);

  return {
    newLevel,
    newXp,
    leveledUp,
    xpInLevel: progress.current,
    xpToNext: progress.needed,
    progressPct: progress.progressPct,
  };
}
