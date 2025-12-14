import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { syncPveKillsToLeaderboard } from "~/server/lib/leaderboard-sync";

// Helper function to calculate power score
function calculatePowerScore(
  vitality: number,
  strength: number,
  speed: number,
  dexterity: number,
  level: number,
): number {
  return vitality * 2 + strength * 3 + speed * 2 + dexterity * 2 + level * 10;
}

// Helper function to calculate win percentage
function calculateWinPercent(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 1000) / 10; // Round to 1 decimal
}

// Helper function to calculate deaths remaining
function calculateDeathsRemaining(deathsUsed: number, deathsLimit: number): number {
  return Math.max(deathsLimit - deathsUsed, 0);
}

// TODO: Add live presence tracking (online/offline status)
// TODO: Add match history for PvP records
// TODO: Add full achievements page implementation
// TODO: Integrate with guild system for guild role display
// TODO: Add friends system integration

export const profileRouter = createTRPCRouter({
  // Get current user's profile
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    // First get user with player data
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        player: {
          include: {
            stats: true,
            guildMember: {
              include: {
                guild: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Get player with bank account and jobs
    const player = await ctx.db.player.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        bankAccount: true,
        userJobs: {
          include: {
            job: {
              select: {
                id: true,
                key: true,
                name: true,
              },
            },
          },
          orderBy: {
            level: "desc",
          },
        },
      },
    });

    let profile = await ctx.db.playerProfile.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            email: true,
          },
        },
        profileStats: true,
        pvpRecord: true,
        pveRecord: true,
        social: true,
        achievements: {
          include: {
            achievement: true,
          },
          orderBy: {
            unlockedAt: "desc",
          },
          take: 8,
        },
      },
    });

    if (!profile) {
      // Create profile if it doesn't exist
      profile = await ctx.db.playerProfile.create({
        data: {
          userId: user.id,
          profileStats: {
            create: {
              vitality: user.player?.stats?.vitality ?? 10,
              strength: user.player?.stats?.strength ?? 10,
              speed: user.player?.stats?.speed ?? 10,
              dexterity: user.player?.stats?.dexterity ?? 10,
            },
          },
          pvpRecord: {
            create: {
              wins: 0,
              losses: 0,
              pvpWinStreakCurrent: 0,
              pvpWinStreakBest: 0,
            },
          },
          pveRecord: {
            create: {
              totalKills: 0,
              bossesSlain: 0,
              deathsUsed: user.player?.deathCount ?? 0,
              deathsLimit: 5,
            },
          },
          social: {
            create: {
              guildName: user.player?.guildMember?.guild?.name ?? null,
              guildRole: user.player?.guildMember?.role ?? null,
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              email: true,
            },
          },
          profileStats: true,
          pvpRecord: true,
          pveRecord: true,
          social: true,
          achievements: {
            include: {
              achievement: true,
            },
            orderBy: {
              unlockedAt: "desc",
            },
            take: 8,
          },
        },
      });
    }

    return {
      ...profile,
      powerScore: calculatePowerScore(
        profile.profileStats?.vitality ?? 10,
        profile.profileStats?.strength ?? 10,
        profile.profileStats?.speed ?? 10,
        profile.profileStats?.dexterity ?? 10,
        user.player?.level ?? 1,
      ),
      winPercent: calculateWinPercent(
        profile.pvpRecord?.wins ?? 0,
        profile.pvpRecord?.losses ?? 0,
      ),
      deathsRemaining: calculateDeathsRemaining(
        profile.pveRecord?.deathsUsed ?? 0,
        profile.pveRecord?.deathsLimit ?? 5,
      ),
      level: user.player?.level ?? 1,
      status: (user.player?.deathCount ?? 0) >= 5 ? "Fallen" : "Alive",
      bankAccount: player?.bankAccount
        ? {
            balanceCoins: player.bankAccount.balanceCoins,
            vaultLevel: player.bankAccount.vaultLevel,
          }
        : null,
      jobs: player?.userJobs.map((uj) => ({
        id: uj.id,
        jobKey: uj.job.key,
        jobName: uj.job.name,
        level: uj.level,
        xp: uj.xp,
        active: uj.active,
      })) ?? [],
    };
  }),

  // Get profile by username or userId
  getProfileByHandleOrId: publicProcedure
    .input(
      z.object({
        handle: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Try to find by username first
      const user = await ctx.db.user.findFirst({
        where: {
          OR: [
            { username: input.handle },
            { id: input.handle },
          ],
        },
        include: {
          player: {
            include: {
              stats: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      // Get player with bank account and jobs
      const player = await ctx.db.player.findUnique({
        where: { userId: user.id },
        include: {
          bankAccount: true,
          userJobs: {
            include: {
              job: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                },
              },
            },
            orderBy: {
              level: "desc",
            },
          },
        },
      });

      const profile = await ctx.db.playerProfile.findUnique({
        where: { userId: user.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              email: true,
            },
          },
          profileStats: true,
          pvpRecord: true,
          pveRecord: true,
          social: true,
          achievements: {
            include: {
              achievement: true,
            },
            orderBy: {
              unlockedAt: "desc",
            },
            take: 8,
          },
        },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      // Sync PvE kills to leaderboard (ensures data stays in sync)
      // Only sync if we have a session (for the profile owner viewing their own profile)
      if (ctx.session?.user?.id) {
        await syncPveKillsToLeaderboard(ctx.session.user.id, ctx.db);
      }

      return {
        ...profile,
        powerScore: calculatePowerScore(
          profile.profileStats?.vitality ?? 10,
          profile.profileStats?.strength ?? 10,
          profile.profileStats?.speed ?? 10,
          profile.profileStats?.dexterity ?? 10,
          user.player?.level ?? 1,
        ),
        winPercent: calculateWinPercent(
          profile.pvpRecord?.wins ?? 0,
          profile.pvpRecord?.losses ?? 0,
        ),
        deathsRemaining: calculateDeathsRemaining(
          profile.pveRecord?.deathsUsed ?? 0,
          profile.pveRecord?.deathsLimit ?? 5,
        ),
        level: user.player?.level ?? 1,
        status: (user.player?.deathCount ?? 0) >= 5 ? "Fallen" : "Alive",
        bankAccount: player?.bankAccount
          ? {
              balanceCoins: player.bankAccount.balanceCoins,
              vaultLevel: player.bankAccount.vaultLevel,
            }
          : null,
        jobs: player?.userJobs.map((uj) => ({
          id: uj.id,
          jobKey: uj.job.key,
          jobName: uj.job.name,
          level: uj.level,
          xp: uj.xp,
          active: uj.active,
        })) ?? [],
      };
    }),

  // Update profile basics (tagline and title)
  updateMyProfileBasics: protectedProcedure
    .input(
      z.object({
        tagline: z.string().max(200).optional(),
        title: z.string().max(50).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.playerProfile.findUnique({
        where: { userId: ctx.session.user.id },
        include: { social: true },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      // Update or create social record
      if (profile.social) {
        await ctx.db.playerSocial.update({
          where: { profileId: profile.id },
          data: {
            tagline: input.tagline,
            title: input.title,
          },
        });
      } else {
        await ctx.db.playerSocial.create({
          data: {
            profileId: profile.id,
            tagline: input.tagline,
            title: input.title,
          },
        });
      }

      return { success: true };
    }),

  // Get all achievements for a profile
  getAchievements: publicProcedure
    .input(
      z.object({
        handle: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: {
          OR: [
            { username: input.handle },
            { id: input.handle },
          ],
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const profile = await ctx.db.playerProfile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      const playerAchievements = await ctx.db.playerAchievement.findMany({
        where: { profileId: profile.id },
        include: {
          achievement: true,
        },
        orderBy: {
          unlockedAt: "desc",
        },
      });

      return playerAchievements.map((pa) => ({
        id: pa.achievement.id,
        key: pa.achievement.key,
        name: pa.achievement.name,
        description: pa.achievement.description,
        icon: pa.achievement.icon,
        rarity: pa.achievement.rarity,
        unlockedAt: pa.unlockedAt,
      }));
    }),

  // Sync PvE kills from profile to leaderboard
  syncPveKills: protectedProcedure.mutation(async ({ ctx }) => {
    await syncPveKillsToLeaderboard(ctx.session.user.id, ctx.db);
    return { success: true };
  }),
});
