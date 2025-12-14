import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { applyRegen } from "~/server/regen/applyRegen";

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
    } else {
      // Apply regen if character exists (server-authoritative)
      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { stats: true },
      });

      if (player?.stats) {
        const now = new Date();
        
        // Ensure lastRegenAt is set
        if (!player.stats.lastRegenAt) {
          const initialLastRegenAt = character.createdAt 
            ? new Date(character.createdAt)
            : new Date(now.getTime() - 60000);
          
          await ctx.db.playerStats.update({
            where: { playerId: player.id },
            data: { lastRegenAt: initialLastRegenAt },
          });
          player.stats.lastRegenAt = initialLastRegenAt;
        }

        const regenResult = applyRegen(now, {
          hp: player.stats.currentHP,
          sp: player.stats.currentSP,
          maxHp: player.stats.maxHP,
          maxSp: player.stats.maxSP,
          hpRegenPerMin: player.stats.hpRegenPerMin ?? 100,
          spRegenPerMin: player.stats.spRegenPerMin ?? 100,
          lastRegenAt: player.stats.lastRegenAt,
        });

        // Update player stats if regen occurred
        if (regenResult.didUpdate) {
          await ctx.db.playerStats.update({
            where: { playerId: player.id },
            data: {
              currentHP: regenResult.hp,
              currentSP: regenResult.sp,
              lastRegenAt: regenResult.lastRegenAt,
            },
          });

          // Sync Character with PlayerStats after regen
          await ctx.db.character.update({
            where: { id: character.id },
            data: {
              currentHp: regenResult.hp,
              currentStamina: regenResult.sp,
            },
          });

          // Update character object for return
          character.currentHp = regenResult.hp;
          character.currentStamina = regenResult.sp;
        }
      }
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

