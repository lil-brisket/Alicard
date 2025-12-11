import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const characterRouter = createTRPCRouter({
  // Get or create the main character for the current user
  getOrCreateCurrent: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get user to access username and gender
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: { username: true, gender: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Find existing character (for now, users have 1 main character)
    let character = await ctx.db.character.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // If no character exists or character has perma-died (deaths >= 5), create a new one
    if (!character || character.deaths >= 5) {
      const baseName = user.username ?? "Alicard";
      const suffix = Math.floor(Math.random() * 9000 + 1000); // 1000-9999
      const name = `${baseName} #${suffix}`;

      // Calculate starting HP and Stamina based on default stats
      const defaultVitality = 5;
      const defaultSpeed = 5;
      const maxHp = 50 + defaultVitality * 5; // 75
      const maxStamina = 20 + defaultVitality * 2 + defaultSpeed * 1; // 35

      character = await ctx.db.character.create({
        data: {
          userId,
          name,
          gender: user.gender,
          level: 1,
          deaths: 0,
          vitality: defaultVitality,
          strength: 5,
          speed: defaultSpeed,
          dexterity: 5,
          currentHp: maxHp,
          maxHp,
          currentStamina: maxStamina,
          maxStamina,
          floor: 1,
          location: "Town Square",
        },
      });
    }

    return character;
  }),

  // Get main character (without creating)
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const character = await ctx.db.character.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return character;
  }),
});

