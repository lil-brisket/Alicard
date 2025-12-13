import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

// Helper function to calculate win percentage
function calculateWinPercent(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 1000) / 10; // Round to 1 decimal
}

// Helper to get period start date
function getPeriodStart(periodType: "daily" | "weekly"): Date {
  const now = new Date();
  if (periodType === "daily") {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  } else {
    // Weekly: Monday at 00:00:00 UTC
    const start = new Date(now);
    const day = start.getUTCDay();
    const diff = start.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setUTCDate(diff);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }
}

export const leaderboardsRouter = createTRPCRouter({
  // Get PvE leaderboard
  getPve: publicProcedure
    .input(
      z.object({
        timeframe: z.enum(["all-time", "daily", "weekly"]).default("all-time"),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.timeframe === "all-time") {
        // Use PlayerLeaderboardStats
        const stats = await ctx.db.playerLeaderboardStats.findMany({
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            pveKills: "desc",
          },
          take: input.limit,
        });

        return stats.map((stat, index) => ({
          rank: index + 1,
          userId: stat.userId,
          username: stat.user.username,
          avatarUrl: stat.user.image,
          pveKills: stat.pveKills,
        }));
      } else {
        // Use PlayerStatsPeriod
        const periodStart = getPeriodStart(input.timeframe);
        const stats = await ctx.db.playerStatsPeriod.findMany({
          where: {
            periodType: input.timeframe === "daily" ? "daily" : "weekly",
            periodStart: periodStart,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            pveKills: "desc",
          },
          take: input.limit,
        });

        return stats.map((stat, index) => ({
          rank: index + 1,
          userId: stat.userId,
          username: stat.user.username,
          avatarUrl: stat.user.image,
          pveKills: stat.pveKills,
        }));
      }
    }),

  // Get PvP leaderboard
  getPvp: publicProcedure
    .input(
      z.object({
        timeframe: z.enum(["all-time", "daily", "weekly"]).default("all-time"),
        limit: z.number().min(1).max(100).default(50),
        minMatches: z.number().min(1).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      let stats: Array<{
        userId: string;
        username: string;
        avatarUrl: string | null;
        pvpKills: number;
        pvpWins: number;
        pvpLosses: number;
        winPct: number;
      }> = [];

      if (input.timeframe === "all-time") {
        // Use PlayerLeaderboardStats
        const allStats = await ctx.db.playerLeaderboardStats.findMany({
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              },
            },
          },
        });

        stats = allStats
          .map((stat) => {
            const totalMatches = stat.pvpWins + stat.pvpLosses;
            if (totalMatches < input.minMatches) return null;

            return {
              userId: stat.userId,
              username: stat.user.username,
              avatarUrl: stat.user.image,
              pvpKills: stat.pvpKills,
              pvpWins: stat.pvpWins,
              pvpLosses: stat.pvpLosses,
              winPct: calculateWinPercent(stat.pvpWins, stat.pvpLosses),
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);
      } else {
        // Use PlayerStatsPeriod
        const periodStart = getPeriodStart(input.timeframe);
        const allStats = await ctx.db.playerStatsPeriod.findMany({
          where: {
            periodType: input.timeframe === "daily" ? "daily" : "weekly",
            periodStart: periodStart,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              },
            },
          },
        });

        stats = allStats
          .map((stat) => {
            const totalMatches = stat.pvpWins + stat.pvpLosses;
            if (totalMatches < input.minMatches) return null;

            return {
              userId: stat.userId,
              username: stat.user.username,
              avatarUrl: stat.user.image,
              pvpKills: stat.pvpKills,
              pvpWins: stat.pvpWins,
              pvpLosses: stat.pvpLosses,
              winPct: calculateWinPercent(stat.pvpWins, stat.pvpLosses),
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);
      }

      // Sort by winPct desc, then pvpKills desc
      stats.sort((a, b) => {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.pvpKills - a.pvpKills;
      });

      // Apply limit and add rank
      return stats.slice(0, input.limit).map((stat, index) => ({
        ...stat,
        rank: index + 1,
      }));
    }),

  // Get Jobs leaderboard
  getJobs: publicProcedure
    .input(
      z.object({
        timeframe: z.enum(["all-time", "daily", "weekly"]).default("all-time"),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.timeframe === "all-time") {
        // Use PlayerLeaderboardStats
        const stats = await ctx.db.playerLeaderboardStats.findMany({
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            jobXpTotal: "desc",
          },
          take: input.limit,
        });

        // Get top job for each user
        const statsWithTopJob = await Promise.all(
          stats.map(async (stat, index) => {
            // Get player from user
            const player = await ctx.db.player.findUnique({
              where: { userId: stat.userId },
              select: { id: true },
            });

            let topJob = null;
            if (player) {
              const jobRecord = await ctx.db.userJob.findFirst({
                where: { playerId: player.id },
                include: {
                  job: {
                    select: {
                      key: true,
                      name: true,
                    },
                  },
                },
                orderBy: {
                  xp: "desc",
                },
              });

              if (jobRecord) {
                topJob = {
                  key: jobRecord.job.key,
                  name: jobRecord.job.name,
                  xp: jobRecord.xp,
                };
              }
            }

            return {
              rank: index + 1,
              userId: stat.userId,
              username: stat.user.username,
              avatarUrl: stat.user.image,
              jobXpTotal: stat.jobXpTotal,
              topJob,
            };
          })
        );

        return statsWithTopJob;
      } else {
        // Use PlayerStatsPeriod
        const periodStart = getPeriodStart(input.timeframe);
        const stats = await ctx.db.playerStatsPeriod.findMany({
          where: {
            periodType: input.timeframe === "daily" ? "daily" : "weekly",
            periodStart: periodStart,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            jobXpTotal: "desc",
          },
          take: input.limit,
        });

        // Get top job for each user
        const statsWithTopJob = await Promise.all(
          stats.map(async (stat, index) => {
            // Get player from user
            const player = await ctx.db.player.findUnique({
              where: { userId: stat.userId },
              select: { id: true },
            });

            let topJob = null;
            if (player) {
              const jobRecord = await ctx.db.userJob.findFirst({
                where: { playerId: player.id },
                include: {
                  job: {
                    select: {
                      key: true,
                      name: true,
                    },
                  },
                },
                orderBy: {
                  xp: "desc",
                },
              });

              if (jobRecord) {
                topJob = {
                  key: jobRecord.job.key,
                  name: jobRecord.job.name,
                  xp: jobRecord.xp,
                };
              }
            }

            return {
              rank: index + 1,
              userId: stat.userId,
              username: stat.user.username,
              avatarUrl: stat.user.image,
              jobXpTotal: stat.jobXpTotal,
              topJob,
            };
          })
        );

        return statsWithTopJob;
      }
    }),
});
