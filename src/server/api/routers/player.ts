import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

// Helper function to sync Character model with PlayerStats
async function syncCharacterWithPlayerStats(
  userId: string,
  playerStats: { currentHP: number; maxHP: number; currentSP: number; maxSP: number; vitality: number; strength: number; speed: number; dexterity: number },
  db: any
) {
  // Find the character by userId
  const character = await db.character.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (character) {
    // Calculate max values based on stats (same formula as PlayerStats)
    const maxHP = 50 + playerStats.vitality * 5;
    const maxSP = 20 + playerStats.vitality * 2 + playerStats.speed * 1;

    await db.character.update({
      where: { id: character.id },
      data: {
        currentHp: playerStats.currentHP,
        maxHp: maxHP,
        currentStamina: playerStats.currentSP,
        maxStamina: maxSP,
        vitality: playerStats.vitality,
        strength: playerStats.strength,
        speed: playerStats.speed,
        dexterity: playerStats.dexterity,
      },
    });
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
    const player = await ctx.db.player.findUnique({
      where: { userId: ctx.session.user.id },
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
              gold: 0,
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

