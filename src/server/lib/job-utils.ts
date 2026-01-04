// Calculate XP required for next level
// XP to next level = 100 * level
export function getXpForLevel(level: number): number {
  return 100 * level;
}

// Calculate level from total XP
export function getLevelFromXp(totalXp: number, maxLevel: number = 100): number {
  let level = 1;
  let xpForCurrentLevel = 0;
  
  while (level < maxLevel) {
    const xpNeeded = getXpForLevel(level);
    if (xpForCurrentLevel + xpNeeded > totalXp) {
      break;
    }
    xpForCurrentLevel += xpNeeded;
    level++;
  }
  
  return level;
}

// Get XP progress for current level
export function getXpProgress(
  level: number,
  totalXp: number
): { current: number; needed: number } {
  let xpForCurrentLevel = 0;
  for (let i = 1; i < level; i++) {
    xpForCurrentLevel += getXpForLevel(i);
  }
  
  const currentXpInLevel = totalXp - xpForCurrentLevel;
  const xpNeededForNext = getXpForLevel(level);
  
  return {
    current: Math.max(0, currentXpInLevel),
    needed: xpNeededForNext,
  };
}

// Calculate max XP for a level cap
export function getMaxXpForLevel(maxLevel: number): number {
  let total = 0;
  for (let i = 1; i < maxLevel; i++) {
    total += getXpForLevel(i);
  }
  return total;
}

/**
 * Add XP to a job and return the updated level and XP.
 * This is the shared function all routers should use for consistent leveling.
 * 
 * @param currentLevel - Current job level
 * @param currentXp - Current total XP
 * @param xpDelta - XP to add (must be >= 0)
 * @param maxLevel - Maximum level cap (default 100)
 * @returns Object with newLevel, newXp, leveledUp flag, and progress info
 */
export function addXp(
  currentLevel: number,
  currentXp: number,
  xpDelta: number,
  maxLevel: number = 100
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

  const oldLevel = getLevelFromXp(currentXp, maxLevel);
  const newXp = Math.min(currentXp + xpDelta, getMaxXpForLevel(maxLevel));
  const newLevel = getLevelFromXp(newXp, maxLevel);
  const leveledUp = newLevel > oldLevel;

  const progress = getXpProgress(newLevel, newXp);

  return {
    newLevel,
    newXp,
    leveledUp,
    xpInLevel: progress.current,
    xpToNext: progress.needed,
    progressPct: progress.needed > 0 ? (progress.current / progress.needed) * 100 : 100,
  };
}
