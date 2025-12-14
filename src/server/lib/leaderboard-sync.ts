import type { PrismaClient } from "../../generated/prisma/client";

/**
 * Syncs PvE kills from PlayerPveRecord (profile) to PlayerLeaderboardStats (leaderboard)
 * This ensures the leaderboard always reflects the accurate kill count from the profile
 */
export async function syncPveKillsToLeaderboard(
  userId: string,
  db: PrismaClient
): Promise<void> {
  try {
    // Get profile with PvE record
    const profile = await db.playerProfile.findUnique({
      where: { userId },
      include: { pveRecord: true },
    });

    if (!profile) {
      return; // No profile, nothing to sync
    }

    const totalKills = profile.pveRecord?.totalKills ?? 0;

    // Get or create leaderboard stats
    const existingStats = await db.playerLeaderboardStats.findUnique({
      where: { userId },
    });

    if (existingStats) {
      // Update to match profile totalKills
      await db.playerLeaderboardStats.update({
        where: { userId },
        data: {
          pveKills: totalKills,
        },
      });
    } else {
      // Create new leaderboard stats with synced value
      await db.playerLeaderboardStats.create({
        data: {
          userId,
          pveKills: totalKills,
          pvpKills: 0,
          pvpWins: 0,
          pvpLosses: 0,
          jobXpTotal: 0,
        },
      });
    }
  } catch (error) {
    // Log error but don't throw - we don't want to break the main flow
    console.error(`Error syncing PvE kills to leaderboard for userId ${userId}:`, error);
  }
}
