import type { PrismaClient } from "@prisma/client";

/**
 * Update PvP win streak when a player wins a PvP match
 * @param db - Prisma client
 * @param userId - User ID of the winning player
 */
export async function updatePvpWinStreakOnWin(
  db: PrismaClient,
  userId: string
): Promise<void> {
  // Get player profile
  const profile = await db.playerProfile.findUnique({
    where: { userId },
    include: { pvpRecord: true },
  });

  if (!profile) {
    console.warn(`Profile not found for userId: ${userId}`);
    return;
  }

  // Ensure PvP record exists
  if (!profile.pvpRecord) {
    await db.playerPvpRecord.create({
      data: {
        profileId: profile.id,
        wins: 1,
        losses: 0,
        pvpWinStreakCurrent: 1,
        pvpWinStreakBest: 1,
      },
    });
    return;
  }

  // Update streak
  const newCurrentStreak = (profile.pvpRecord.pvpWinStreakCurrent ?? 0) + 1;
  const newBestStreak = Math.max(
    profile.pvpRecord.pvpWinStreakBest ?? 0,
    newCurrentStreak
  );

  await db.playerPvpRecord.update({
    where: { profileId: profile.id },
    data: {
      wins: { increment: 1 },
      pvpWinStreakCurrent: newCurrentStreak,
      pvpWinStreakBest: newBestStreak,
    },
  });
}

/**
 * Update PvP win streak when a player loses a PvP match
 * @param db - Prisma client
 * @param userId - User ID of the losing player
 */
export async function updatePvpWinStreakOnLoss(
  db: PrismaClient,
  userId: string
): Promise<void> {
  // Get player profile
  const profile = await db.playerProfile.findUnique({
    where: { userId },
    include: { pvpRecord: true },
  });

  if (!profile) {
    console.warn(`Profile not found for userId: ${userId}`);
    return;
  }

  // Ensure PvP record exists
  if (!profile.pvpRecord) {
    await db.playerPvpRecord.create({
      data: {
        profileId: profile.id,
        wins: 0,
        losses: 1,
        pvpWinStreakCurrent: 0,
        pvpWinStreakBest: 0,
      },
    });
    return;
  }

  // Reset current streak to 0 on loss
  await db.playerPvpRecord.update({
    where: { profileId: profile.id },
    data: {
      losses: { increment: 1 },
      pvpWinStreakCurrent: 0,
    },
  });
}
