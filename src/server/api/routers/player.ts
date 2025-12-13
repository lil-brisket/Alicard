import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { applyRegen } from "~/server/regen/applyRegen";

// Helper function to sync Character model with PlayerStats
async function syncCharacterWithPlayerStats(
  userId: string,
  playerStats: { currentHP: number; maxHP: number; currentSP: number; maxSP: number; vitality: number; strength: number; speed: number; dexterity: number },
  db: any
) {
  try {
    // Find the character by userId
    const character = await db.character.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (character) {
      // Use the maxHP and maxSP values from PlayerStats (they may include equipment bonuses or other modifiers)
      await db.character.update({
        where: { id: character.id },
        data: {
          currentHp: playerStats.currentHP,
          maxHp: playerStats.maxHP,
          currentStamina: playerStats.currentSP,
          maxStamina: playerStats.maxSP,
          vitality: playerStats.vitality,
          strength: playerStats.strength,
          speed: playerStats.speed,
          dexterity: playerStats.dexterity,
        },
      });
    } else {
      // Character doesn't exist - this shouldn't happen in normal flow, but log it
      console.warn(`Character not found for userId: ${userId} when syncing PlayerStats`);
    }
  } catch (error) {
    // Log error but don't throw - we don't want to break the operation if sync fails
    console.error(`Error syncing Character with PlayerStats for userId ${userId}:`, error);
  }
}

// Character name validation
const characterNameSchema = z
  .string()
  .min(3, "Character name must be at least 3 characters")
  .max(20, "Character name must be at most 20 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Character name can only contain letters, numbers, underscores, and hyphens"
  );

// Stat allocation schema
const statAllocationSchema = z.object({
  vitality: z.number().int().min(0).max(100),
  strength: z.number().int().min(0).max(100),
  speed: z.number().int().min(0).max(100),
  dexterity: z.number().int().min(0).max(100),
}).refine(
  (data) => {
    const total = data.vitality + data.strength + data.speed + data.dexterity;
    return total <= 40; // Starting stat points
  },
  {
    message: "Total stat points cannot exceed 40",
  }
);

export const playerRouter = createTRPCRouter({
  // Get current player character
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    const player = await ctx.db.player.findUnique({
      where: { userId },
      include: {
        stats: true,
        position: {
          include: {
            tile: true,
          },
        },
        equipment: true,
        occupation: true,
        guildMember: {
          include: {
            guild: true,
          },
        },
      },
    });

    if (!player) {
      return null;
    }

    // Check if player is deleted (permadeath)
    if (player.isDeleted) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Character has been permanently deleted",
      });
    }

    // Sync PlayerStats with Character to ensure pools match
    const character = await ctx.db.character.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (player.stats && character) {
      // Ensure regen values are set to base 100 if not present
      if (!player.stats.hpRegenPerMin || !player.stats.spRegenPerMin) {
        // Initialize lastRegenAt to character creation time so all elapsed time counts for regen
        const initialLastRegenAt = character.createdAt 
          ? new Date(character.createdAt)
          : new Date(Date.now() - 60000); // Fallback: 1 minute ago
        
        await ctx.db.playerStats.update({
          where: { playerId: player.id },
          data: {
            hpRegenPerMin: 100,
            spRegenPerMin: 100,
            lastRegenAt: player.stats.lastRegenAt ?? initialLastRegenAt,
          },
        });
        player.stats.hpRegenPerMin = 100;
        player.stats.spRegenPerMin = 100;
        if (!player.stats.lastRegenAt) {
          player.stats.lastRegenAt = initialLastRegenAt;
        }
      }

      // Calculate correct max values from Character stats
      // HP = 50 + (Vitality * 5)
      // SP = 20 + (Vitality * 2) + (Speed * 1)
      const correctMaxHP = 50 + character.vitality * 5;
      const correctMaxSP = 20 + character.vitality * 2 + character.speed * 1;

      // If PlayerStats max values don't match Character, sync them
      if (player.stats.maxHP !== correctMaxHP || player.stats.maxSP !== correctMaxSP) {
        // Cap current values to new max if they exceed it
        const cappedCurrentHP = Math.min(player.stats.currentHP, correctMaxHP);
        const cappedCurrentSP = Math.min(player.stats.currentSP, correctMaxSP);

        await ctx.db.playerStats.update({
          where: { playerId: player.id },
          data: {
            maxHP: correctMaxHP,
            maxSP: correctMaxSP,
            currentHP: cappedCurrentHP,
            currentSP: cappedCurrentSP,
            vitality: character.vitality,
            strength: character.strength,
            speed: character.speed,
            dexterity: character.dexterity,
          },
        });

        // Update the returned player object
        player.stats.maxHP = correctMaxHP;
        player.stats.maxSP = correctMaxSP;
        player.stats.currentHP = cappedCurrentHP;
        player.stats.currentSP = cappedCurrentSP;
      }

      // Apply regen constantly (regardless of battle status - works even when AFK/offline)
      // Note: applyRegen already caps HP/SP at max values, so regen rate can be higher than max
      // (e.g., 100 regen/min with 75 max HP means you'll reach max in < 1 minute)
      const now = new Date();
      
      // Ensure lastRegenAt is set (initialize to character creation time if missing)
      // This allows regen to apply for all elapsed time since character creation
      if (!player.stats.lastRegenAt) {
        // Use character creation time so all elapsed time counts for regen
        const initialLastRegenAt = character.createdAt 
          ? new Date(character.createdAt)
          : new Date(now.getTime() - 60000); // Fallback: 1 minute ago
        
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
        hpRegenPerMin: player.stats.hpRegenPerMin,
        spRegenPerMin: player.stats.spRegenPerMin,
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

        // Update the returned player object with new values
        player.stats.currentHP = regenResult.hp;
        player.stats.currentSP = regenResult.sp;
        player.stats.lastRegenAt = regenResult.lastRegenAt;
      }

      // Sync Character with PlayerStats after regen
      await ctx.db.character.updateMany({
        where: { userId },
        data: {
          currentHp: player.stats.currentHP,
          maxHp: player.stats.maxHP,
          currentStamina: player.stats.currentSP,
          maxStamina: player.stats.maxSP,
        },
      });
    }

    return player;
  }),

  // Create new player character
  create: protectedProcedure
    .input(
      z.object({
        characterName: characterNameSchema,
        stats: statAllocationSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already has a character
      const existingPlayer = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (existingPlayer && !existingPlayer.isDeleted) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have an active character",
        });
      }

      // Check if character name is taken
      const nameTaken = await ctx.db.player.findUnique({
        where: { characterName: input.characterName },
      });

      if (nameTaken && !nameTaken.isDeleted) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Character name is already taken",
        });
      }

      // Calculate starting HP and SP based on stats
      // HP = 50 + (Vitality * 5)
      // SP = 20 + (Vitality * 2) + (Speed * 1)
      const maxHP = 50 + input.stats.vitality * 5;
      const maxSP = 20 + input.stats.vitality * 2 + input.stats.speed * 1;

      // Find starting town (tile 0,0 or first safe zone)
      let startingTile = await ctx.db.mapTile.findFirst({
        where: {
          isSafeZone: true,
          tileType: "TOWN",
        },
      });

      // If no town exists, create a default starting position
      if (!startingTile) {
        startingTile = await ctx.db.mapTile.upsert({
          where: { x_y: { x: 0, y: 0 } },
          update: {},
          create: {
            x: 0,
            y: 0,
            tileType: "TOWN",
            zoneType: "SAFE",
            isSafeZone: true,
            description: "Starting Town",
          },
        });
      }

      // Create player with all related data
      const player = await ctx.db.player.create({
        data: {
          userId: ctx.session.user.id,
          characterName: input.characterName,
          level: 1,
          experience: 0,
          gold: 100, // Starting gold
          deathCount: 0,
          stats: {
            create: {
              vitality: input.stats.vitality,
              strength: input.stats.strength,
              speed: input.stats.speed,
              dexterity: input.stats.dexterity,
              maxHP,
              currentHP: maxHP,
              maxSP,
              currentSP: maxSP,
              statPoints: 0,
              hpRegenPerMin: 100,
              spRegenPerMin: 100,
              lastRegenAt: new Date(),
            },
          },
          position: {
            create: {
              tileX: startingTile.x,
              tileY: startingTile.y,
              tileId: startingTile.id,
            },
          },
          equipment: {
            create: {},
          },
          skillLoadout: {
            create: {},
          },
          bankAccount: {
            create: {
              balanceCoins: 0,
              vaultLevel: 1,
            },
          },
        },
        include: {
          stats: true,
          position: {
            include: {
              tile: true,
            },
          },
          equipment: true,
        },
      });

      return player;
    }),

  // Update stats (when leveling up)
  allocateStats: protectedProcedure
    .input(
      z.object({
        vitality: z.number().int().min(0).optional(),
        strength: z.number().int().min(0).optional(),
        speed: z.number().int().min(0).optional(),
        dexterity: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
        include: { stats: true },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      }

      if (!player.stats) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Player stats not found",
        });
      }

      // Calculate total points to allocate
      const pointsToAllocate =
        (input.vitality ?? 0) +
        (input.strength ?? 0) +
        (input.speed ?? 0) +
        (input.dexterity ?? 0);

      if (pointsToAllocate > player.stats.statPoints) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not enough stat points available",
        });
      }

      // Update stats
      const updatedStats = await ctx.db.playerStats.update({
        where: { playerId: player.id },
        data: {
          vitality: {
            increment: input.vitality ?? 0,
          },
          strength: {
            increment: input.strength ?? 0,
          },
          speed: {
            increment: input.speed ?? 0,
          },
          dexterity: {
            increment: input.dexterity ?? 0,
          },
          statPoints: {
            decrement: pointsToAllocate,
          },
        },
      });

      // Recalculate HP and SP
      const maxHP = 50 + updatedStats.vitality * 5;
      const maxSP = 20 + updatedStats.vitality * 2 + updatedStats.speed * 1;

      // Update max HP/SP (don't reduce current if it would go below current)
      const finalStats = await ctx.db.playerStats.update({
        where: { playerId: player.id },
        data: {
          maxHP,
          maxSP,
          currentHP: Math.min(updatedStats.currentHP, maxHP),
          currentSP: Math.min(updatedStats.currentSP, maxSP),
        },
      });

      // Sync Character model with PlayerStats
      await syncCharacterWithPlayerStats(
        player.userId,
        {
          currentHP: finalStats.currentHP,
          maxHP: finalStats.maxHP,
          currentSP: finalStats.currentSP,
          maxSP: finalStats.maxSP,
          vitality: finalStats.vitality,
          strength: finalStats.strength,
          speed: finalStats.speed,
          dexterity: finalStats.dexterity,
        },
        ctx.db
      );

      return { success: true };
    }),

  // Get player stats
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const player = await ctx.db.player.findUnique({
      where: { userId: ctx.session.user.id },
      include: { stats: true },
    });

    if (!player || player.isDeleted) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Character not found",
      });
    }

    return player.stats;
  }),

  // Get player inventory
  getInventory: protectedProcedure.query(async ({ ctx }) => {
    const player = await ctx.db.player.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!player || player.isDeleted) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Character not found",
      });
    }

    const inventoryItems = await ctx.db.inventoryItem.findMany({
      where: { playerId: player.id },
      include: {
        item: true,
      },
      orderBy: [
        { item: { name: "asc" } },
        { createdAt: "asc" },
      ],
    });

    return inventoryItems;
  }),
});

