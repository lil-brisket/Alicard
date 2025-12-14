import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const mapRouter = createTRPCRouter({
  // Get current player position and surrounding tiles
  getCurrentPosition: protectedProcedure.query(async ({ ctx }) => {
    const player = await ctx.db.player.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        position: {
          include: {
            tile: true,
          },
        },
      },
    });

    if (!player || player.isDeleted) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Character not found",
      });
    }

    if (!player.position) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Player position not found",
      });
    }

    return player.position;
  }),

  // Get surrounding tiles (for map view)
  getSurroundingTiles: protectedProcedure
    .input(
      z.object({
        radius: z.number().int().min(1).max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
        include: { position: true },
      });

      if (!player || player.isDeleted || !player.position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      }

      const centerX = player.position.tileX;
      const centerY = player.position.tileY;

      // Get tiles in radius
      const tiles = await ctx.db.mapTile.findMany({
        where: {
          x: {
            gte: centerX - input.radius,
            lte: centerX + input.radius,
          },
          y: {
            gte: centerY - input.radius,
            lte: centerY + input.radius,
          },
        },
        include: {
          npcs: true,
          encounters: {
            where: {
              isActive: true,
            },
          },
        },
      });

      return tiles;
    }),

  // Move player to new position
  // TODO: rate limit movement actions (e.g., max 1 move per second, 60 moves per minute)
  // This prevents accidental DDOS-by-player and movement abuse
  move: protectedProcedure
    .input(
      z.object({
        direction: z.enum(["north", "south", "east", "west"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
        include: { position: true, stats: true },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      }

      if (!player.position) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Player position not found",
        });
      }

      // Calculate new position
      let newX = player.position.tileX;
      let newY = player.position.tileY;

      switch (input.direction) {
        case "north":
          newY -= 1;
          break;
        case "south":
          newY += 1;
          break;
        case "east":
          newX += 1;
          break;
        case "west":
          newX -= 1;
          break;
      }

      // Check if tile exists, create if it doesn't
      let targetTile = await ctx.db.mapTile.findUnique({
        where: { x_y: { x: newX, y: newY } },
      });

      if (!targetTile) {
        // Generate a new tile (basic generation - can be enhanced later)
        const zoneType = determineZoneType(newX, newY);
        const tileType = determineTileType(zoneType);
        
        targetTile = await ctx.db.mapTile.create({
          data: {
            x: newX,
            y: newY,
            tileType,
            zoneType,
            isSafeZone: zoneType === "SAFE",
            hasResource: Math.random() > 0.7,
            resourceType: getRandomResourceType(),
            description: generateTileDescription(tileType, zoneType),
          },
        });
      }

      // Update player position
      const updatedPosition = await ctx.db.mapPosition.update({
        where: { playerId: player.id },
        data: {
          tileX: newX,
          tileY: newY,
          tileId: targetTile.id,
        },
        include: {
          tile: {
            include: {
              npcs: true,
              encounters: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
      });

      // Check for random encounter based on zone type
      const encounterChance = getEncounterChance(targetTile.zoneType);
      const hasEncounter = Math.random() < encounterChance;

      return {
        position: updatedPosition,
        hasEncounter,
        encounter: hasEncounter
          ? await createRandomEncounter(newX, newY, targetTile.id, ctx.db)
          : null,
      };
    }),

  // Get tile at specific coordinates
  getTile: protectedProcedure
    .input(
      z.object({
        x: z.number().int(),
        y: z.number().int(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tile = await ctx.db.mapTile.findUnique({
        where: { x_y: { x: input.x, y: input.y } },
        include: {
          npcs: true,
          encounters: {
            where: {
              isActive: true,
            },
          },
        },
      });

      return tile;
    }),
});

// Helper functions for map generation
function determineZoneType(x: number, y: number): "SAFE" | "LOW_DANGER" | "MEDIUM_DANGER" | "HIGH_DANGER" | "EXTREME_DANGER" {
  const distance = Math.sqrt(x * x + y * y);
  
  if (distance < 5) return "SAFE";
  if (distance < 15) return "LOW_DANGER";
  if (distance < 30) return "MEDIUM_DANGER";
  if (distance < 50) return "HIGH_DANGER";
  return "EXTREME_DANGER";
}

function determineTileType(zoneType: string): "GRASS" | "FOREST" | "MOUNTAIN" | "RIVER" | "DESERT" | "DUNGEON" | "TOWN" | "SHRINE" | "ROAD" {
  if (zoneType === "SAFE") {
    const types: ("TOWN" | "SHRINE" | "ROAD")[] = ["TOWN", "SHRINE", "ROAD"];
    return types[Math.floor(Math.random() * types.length)] ?? "GRASS";
  }
  
  const types: ("GRASS" | "FOREST" | "MOUNTAIN" | "RIVER" | "DESERT" | "DUNGEON")[] = 
    ["GRASS", "FOREST", "MOUNTAIN", "RIVER", "DESERT", "DUNGEON"];
  return types[Math.floor(Math.random() * types.length)] ?? "GRASS";
}

function getRandomResourceType(): "ORE" | "HERB" | "FISH" | "WOOD" | "RARE_ITEM" {
  const types: ("ORE" | "HERB" | "FISH" | "WOOD" | "RARE_ITEM")[] = 
    ["ORE", "HERB", "FISH", "WOOD", "RARE_ITEM"];
  return types[Math.floor(Math.random() * types.length)] ?? "ORE";
}

function generateTileDescription(
  tileType: string,
  zoneType: string
): string {
  const descriptions: Record<string, string> = {
    GRASS: "A peaceful grassy field",
    FOREST: "A dense forest with tall trees",
    MOUNTAIN: "Rocky mountain terrain",
    RIVER: "A flowing river",
    DESERT: "A vast desert",
    DUNGEON: "A dark dungeon entrance",
    TOWN: "A bustling town",
    SHRINE: "A sacred shrine",
    ROAD: "A well-traveled road",
  };

  return descriptions[tileType] ?? "An unknown area";
}

function getEncounterChance(
  zoneType: "SAFE" | "LOW_DANGER" | "MEDIUM_DANGER" | "HIGH_DANGER" | "EXTREME_DANGER"
): number {
  const chances: Record<string, number> = {
    SAFE: 0.0,
    LOW_DANGER: 0.2,
    MEDIUM_DANGER: 0.4,
    HIGH_DANGER: 0.6,
    EXTREME_DANGER: 0.8,
  };

  return chances[zoneType] ?? 0;
}

async function createRandomEncounter(
  x: number,
  y: number,
  tileId: number,
  db: any
) {
  const enemyTypes = ["Wolf", "Goblin", "Bandit", "Skeleton", "Orc"];
  const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)] ?? "Wolf";
  const enemyLevel = Math.floor(Math.random() * 5) + 1;

  const encounter = await db.encounter.create({
    data: {
      tileX: x,
      tileY: y,
      tileId,
      enemyType,
      enemyLevel,
      isActive: true,
    },
  });

  return encounter;
}

