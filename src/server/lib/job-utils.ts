// Calculate XP required for next level
// XP to next level = 100 * level
export function getXpForLevel(level: number): number {
  return 100 * level;
}

// Calculate level from total XP
export function getLevelFromXp(totalXp: number, maxLevel: number = 10): number {
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
