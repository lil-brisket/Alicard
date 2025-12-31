import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { type TileType, type WorldMap, idx, getViewport } from "~/lib/types/world-map";

// Convert Prisma TileType enum to new TileType union
function convertTileType(prismaType: string): TileType {
  const mapping: Record<string, TileType> = {
    GRASS: "grass",
    FOREST: "forest",
    MOUNTAIN: "mountain",
    RIVER: "water",
    DESERT: "grass", // Default to grass for unmapped types
    DUNGEON: "grass",
    TOWN: "town",
    SHRINE: "town", // Shrines appear as towns
    ROAD: "road",
    PLAIN: "grass", // Plain maps to grass
  };
  return mapping[prismaType] ?? "grass";
}

// Convert World + MapTile[] to WorldMap format
function convertToWorldMap(
  world: { id: string; width: number; height: number },
  tiles: Array<{ x: number; y: number; tileType: string }>
): WorldMap {
  const tileArray: TileType[] = new Array(world.width * world.height).fill("grass");

  for (const tile of tiles) {
    const i = idx(tile.x, tile.y, world.width);
    if (i >= 0 && i < tileArray.length) {
      tileArray[i] = convertTileType(tile.tileType);
    }
  }

  return {
    id: world.id,
    width: world.width,
    height: world.height,
    tiles: tileArray,
  };
}

// Get discovered tiles array from MapPosition (defaults to all false)
function getDiscoveredTiles(
  mapSize: number,
  discovered: boolean[] | null | undefined
): boolean[] {
  if (discovered && Array.isArray(discovered) && discovered.length === mapSize) {
    return discovered;
  }
  return new Array(mapSize).fill(false);
}

export const worldRouter = createTRPCRouter({
  // Get active world with all tiles
  getActiveWorld: protectedProcedure.query(async ({ ctx }) => {
    // Get or create default world
    let world = await ctx.db.world.findUnique({
      where: { id: "default-world" },
      include: {
        tiles: {
          orderBy: [
            { y: "asc" },
            { x: "asc" },
          ],
        },
      },
    });

    // If world doesn't exist, create it (fallback - should be seeded)
    if (!world) {
      world = await ctx.db.world.create({
        data: {
          id: "default-world",
          name: "Alicard",
          width: 20,
          height: 20,
        },
        include: {
          tiles: true,
        },
      });
    }

    return world;
  }),

  // Get viewport around player position
  getViewport: protectedProcedure
    .input(z.object({ mapId: z.string() }))
    .query(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUniqueOrThrow({
        where: { userId: ctx.session.user.id },
        include: { position: true },
      });

      if (!player.position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player position not found",
        });
      }

      const world = await ctx.db.world.findUniqueOrThrow({
        where: { id: input.mapId },
        include: {
          tiles: {
            orderBy: [
              { y: "asc" },
              { x: "asc" },
            ],
          },
        },
      });

      const map = convertToWorldMap(world, world.tiles);
      const mapSize = map.width * map.height;
      let discovered = getDiscoveredTiles(
        mapSize,
        (player.position.discoveredTiles as boolean[] | null | undefined) ?? null
      );

      // Mark all tiles in the viewport (7x7 area) as discovered (for display only)
      // Note: We don't persist this in queries - persistence happens in mutations
      const radius = 3; // viewport radius
      const playerX = player.position.tileX;
      const playerY = player.position.tileY;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = playerX + dx;
          const y = playerY + dy;
          
          // Check bounds
          if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
            const tileIndex = idx(x, y, map.width);
            if (tileIndex >= 0 && tileIndex < discovered.length) {
              discovered[tileIndex] = true;
            }
          }
        }
      }

      return getViewport({
        map,
        playerX: player.position.tileX,
        playerY: player.position.tileY,
        discovered,
      });
    }),

  // Move player in 8 directions
  move: protectedProcedure
    .input(
      z.object({
        dir: z.enum(["N", "S", "E", "W", "NE", "NW", "SE", "SW"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUniqueOrThrow({
        where: { userId: ctx.session.user.id },
        include: { position: true },
      });

      if (!player.position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player position not found",
        });
      }

      const world = await ctx.db.world.findUniqueOrThrow({
        where: { id: player.position.worldId },
        include: {
          tiles: {
            orderBy: [
              { y: "asc" },
              { x: "asc" },
            ],
          },
        },
      });

      const map = convertToWorldMap(world, world.tiles);

      const delta = {
        N: { dx: 0, dy: -1 },
        S: { dx: 0, dy: 1 },
        E: { dx: 1, dy: 0 },
        W: { dx: -1, dy: 0 },
        NE: { dx: 1, dy: -1 },
        NW: { dx: -1, dy: -1 },
        SE: { dx: 1, dy: 1 },
        SW: { dx: -1, dy: 1 },
      }[input.dir];

      const nextX = player.position.tileX + delta.dx;
      const nextY = player.position.tileY + delta.dy;

      // Bounds check
      if (
        nextX < 0 ||
        nextY < 0 ||
        nextX >= map.width ||
        nextY >= map.height
      ) {
        const mapSize = map.width * map.height;
        let discovered = getDiscoveredTiles(
          mapSize,
          (player.position.discoveredTiles as boolean[] | null | undefined) ?? null
        );
        
        // Mark all tiles in viewport as discovered
        const radius = 3;
        const playerX = player.position.tileX;
        const playerY = player.position.tileY;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const x = playerX + dx;
            const y = playerY + dy;
            if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
              const viewportTileIndex = idx(x, y, map.width);
              if (viewportTileIndex >= 0 && viewportTileIndex < discovered.length) {
                discovered[viewportTileIndex] = true;
              }
            }
          }
        }
        
        return getViewport({
          map,
          playerX: player.position.tileX,
          playerY: player.position.tileY,
          discovered,
        });
      }

      // Collision check: forbid water
      const tileIndex = idx(nextX, nextY, map.width);
      const nextType = map.tiles[tileIndex];
      const blocked = nextType === "water";

      if (blocked) {
        const mapSize = map.width * map.height;
        let discovered = getDiscoveredTiles(
          mapSize,
          (player.position.discoveredTiles as boolean[] | null | undefined) ?? null
        );
        
        // Mark all tiles in viewport as discovered
        const radius = 3;
        const playerX = player.position.tileX;
        const playerY = player.position.tileY;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const x = playerX + dx;
            const y = playerY + dy;
            if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
              const viewportTileIndex = idx(x, y, map.width);
              if (viewportTileIndex >= 0 && viewportTileIndex < discovered.length) {
                discovered[viewportTileIndex] = true;
              }
            }
          }
        }
        
        return getViewport({
          map,
          playerX: player.position.tileX,
          playerY: player.position.tileY,
          discovered,
        });
      }

      // Mark discovery - mark all tiles in the viewport (7x7 area) as discovered
      const mapSize = map.width * map.height;
      const discovered = getDiscoveredTiles(
        mapSize,
        (player.position.discoveredTiles as boolean[] | null | undefined) ?? null
      );

      // Mark all tiles in the viewport around the new position as discovered
      const radius = 3; // viewport radius
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = nextX + dx;
          const y = nextY + dy;
          
          // Check bounds
          if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
            const viewportTileIndex = idx(x, y, map.width);
            if (viewportTileIndex >= 0 && viewportTileIndex < discovered.length) {
              discovered[viewportTileIndex] = true;
            }
          }
        }
      }

      // Update player position with discovered tiles
      await ctx.db.mapPosition.update({
        where: { id: player.position.id },
        data: {
          tileX: nextX,
          tileY: nextY,
          discoveredTiles: discovered,
        },
      });

      return getViewport({
        map,
        playerX: nextX,
        playerY: nextY,
        discovered,
      });
    }),
});
