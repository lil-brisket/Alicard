/**
 * Applies real-time regeneration to HP/SP pools based on elapsed time.
 * 
 * Uses whole-minute ticks to avoid fractional rounding and prevent double-dipping.
 * 
 * @param now - Current timestamp
 * @param character - Character stats with regen fields
 * @returns Updated stats and whether any update occurred
 */
export function applyRegen(
  now: Date,
  character: {
    hp: number;
    sp: number;
    maxHp: number;
    maxSp: number;
    hpRegenPerMin: number;
    spRegenPerMin: number;
    lastRegenAt: Date;
  }
): {
  hp: number;
  sp: number;
  lastRegenAt: Date;
  didUpdate: boolean;
} {
  const elapsedMs = now.getTime() - character.lastRegenAt.getTime();
  const regenTicks = Math.floor(elapsedMs / 60000); // whole minutes

  // If no full minute has passed, no update needed
  if (regenTicks <= 0) {
    return {
      hp: character.hp,
      sp: character.sp,
      lastRegenAt: character.lastRegenAt,
      didUpdate: false,
    };
  }

  // Calculate new HP/SP values (capped at max)
  const newHp = Math.min(
    character.maxHp,
    character.hp + regenTicks * character.hpRegenPerMin
  );
  const newSp = Math.min(
    character.maxSp,
    character.sp + regenTicks * character.spRegenPerMin
  );

  // Update lastRegenAt by the amount of time actually consumed
  const newLastRegenAt = new Date(
    character.lastRegenAt.getTime() + regenTicks * 60000
  );

  return {
    hp: newHp,
    sp: newSp,
    lastRegenAt: newLastRegenAt,
    didUpdate: true,
  };
}
