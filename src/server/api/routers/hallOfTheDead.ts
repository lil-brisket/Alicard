import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

export const hallOfTheDeadRouter = createTRPCRouter({
  // Get top 10 dead players for widget
  getTop10: publicProcedure.query(async ({ ctx }) => {
    const deadPlayers = await ctx.db.player.findMany({
      where: {
        OR: [
          { isDeleted: true }, // Permanently deleted (5 deaths)
          { deathCount: { gt: 0 } }, // Any player who has died at least once
        ],
      },
      select: {
        id: true,
        characterName: true,
        deathCount: true,
        level: true,
        createdAt: true,
        deathLogs: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            cause: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { isDeleted: "desc" }, // Permanently dead first
        { deathCount: "desc" },
        { createdAt: "desc" },
      ],
      take: 10,
    });

    return deadPlayers.map((player) => ({
      characterName: player.characterName,
      deathCount: player.deathCount,
      level: player.level,
      isPermanentlyDead: player.deathCount >= 5,
      lastDeathCause: player.deathLogs[0]?.cause ?? "Unknown",
      lastDeathDate: player.deathLogs[0]?.createdAt ?? player.createdAt,
    }));
  }),

  // Get full leaderboard with pagination
  getLeaderboard: publicProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const [deadPlayers, total] = await Promise.all([
        ctx.db.player.findMany({
          where: {
            OR: [
              { isDeleted: true },
              { deathCount: { gt: 0 } },
            ],
          },
          select: {
            id: true,
            characterName: true,
            deathCount: true,
            level: true,
            createdAt: true,
            deathLogs: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              select: {
                cause: true,
                createdAt: true,
              },
            },
          },
          orderBy: [
            { isDeleted: "desc" }, // Permanently dead first
            { deathCount: "desc" },
            { createdAt: "desc" },
          ],
          skip,
          take: input.limit,
        }),
        ctx.db.player.count({
          where: {
            OR: [
              { isDeleted: true },
              { deathCount: { gt: 0 } },
            ],
          },
        }),
      ]);

      return {
        players: deadPlayers.map((player) => ({
          characterName: player.characterName,
          deathCount: player.deathCount,
          level: player.level,
          isPermanentlyDead: player.deathCount >= 5,
          lastDeathCause: player.deathLogs[0]?.cause ?? "Unknown",
          lastDeathDate: player.deathLogs[0]?.createdAt ?? player.createdAt,
        })),
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),
});

