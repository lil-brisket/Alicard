import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const characterRouter = createTRPCRouter({
  // Always return the current alive character, create one if missing
  getOrCreateCurrent: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Prefer an alive character
    let character = await ctx.db.character.findFirst({
      where: { userId, isDead: false },
    });

    if (!character) {
      const baseName = ctx.session.user.name ?? "Alicard";
      const suffix = Math.floor(Math.random() * 9000 + 1000); // 1000-9999
      const name = `${baseName} #${suffix}`;

      character = await ctx.db.character.create({
        data: {
          userId,
          name,
          // default stats from schema will fill in
        },
      });
    }

    return character;
  }),

  // Hall of the Dead: public, for landing + dedicated page
  hallOfTheDead: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 20;

      const deadCharacters = await ctx.db.character.findMany({
        where: { isDead: true },
        orderBy: [
          { floorsCleared: "desc" },
          { level: "desc" },
          { deathAt: "desc" },
        ],
        take: limit,
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      return deadCharacters;
    }),
});

