import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "~/server/types/prisma";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";
import { logAuditEvent } from "~/server/lib/audit";

const contentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const tileTypeSchema = z.enum([
  "GRASS", "FOREST", "MOUNTAIN", "RIVER", "DESERT", "DUNGEON", "TOWN", "SHRINE", "ROAD", "PLAIN", "WATER",
  "GROUND", "WALL", "DOOR", "PORTAL", "POI"
]);
const tileOverlaySchema = z.enum(["NONE", "SAFEZONE", "DANGER", "TOWN", "DUNGEON", "RESOURCE_RICH"]);
const poiTypeSchema = z.enum(["NPC", "SHOP", "BANK", "GUILD_HALL", "PORTAL", "SHRINE", "QUEST_BOARD"]);

export const contentMapsRouter = createTRPCRouter({
  // MapDefinition CRUD
  list: contentProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.MapDefinitionWhereInput = {
        ...(input.includeArchived ? {} : { isArchived: false }),
        ...(input.search ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { slug: { contains: input.search, mode: "insensitive" } },
          ],
        } : {}),
      };

      const maps = await ctx.db.mapDefinition.findMany({
        where,
        take: input.limit,
        orderBy: { updatedAt: "desc" },
        include: {
          versions: {
            where: { status: "PUBLISHED" },
            take: 1,
            select: { versionNumber: true, publishedAt: true },
          },
        },
      });

      return maps.map((map) => ({
        ...map,
        publishedVersion: map.versions[0]?.versionNumber ?? null,
      }));
    }),

  get: contentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const map = await ctx.db.mapDefinition.findUnique({
        where: { id: input.id },
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            select: {
              id: true,
              versionNumber: true,
              status: true,
              width: true,
              height: true,
              createdAt: true,
              publishedAt: true,
              changeNotes: true,
            },
          },
        },
      });

      if (!map) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Map not found",
        });
      }

      return map;
    }),

  create: contentProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        biome: z.string().optional(),
        recommendedMinLevel: z.number().int().min(1).optional(),
        recommendedMaxLevel: z.number().int().min(1).optional(),
        dangerRating: z.number().int().min(1).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check slug uniqueness
      const existing = await ctx.db.mapDefinition.findUnique({
        where: { slug: input.slug },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A map with this slug already exists",
        });
      }

      const map = await ctx.db.mapDefinition.create({
        data: input,
      });

      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        action: "MAP_CREATED",
        targetEntityType: "MapDefinition",
        targetEntityId: map.id,
        payloadJson: { name: map.name, slug: map.slug },
      });

      return map;
    }),

  update: contentProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        biome: z.string().optional().nullable(),
        recommendedMinLevel: z.number().int().min(1).optional().nullable(),
        recommendedMaxLevel: z.number().int().min(1).optional().nullable(),
        dangerRating: z.number().int().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;

      const map = await ctx.db.mapDefinition.findUnique({
        where: { id },
      });

      if (!map) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Map not found",
        });
      }

      const updated = await ctx.db.mapDefinition.update({
        where: { id },
        data: patch,
      });

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: "MAP_UPDATED",
        targetEntityType: "MapDefinition",
        targetEntityId: id,
        payloadJson: { patch },
      });

      return updated;
    }),

  clone: contentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.mapDefinition.findUnique({
        where: { id: input.id },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Map not found",
        });
      }

      const newSlug = `${source.slug}_copy_${Date.now()}`;
      const newName = `${source.name} (Copy)`;

      const cloned = await ctx.db.mapDefinition.create({
        data: {
          name: newName,
          slug: newSlug,
          description: source.description,
          biome: source.biome,
          recommendedMinLevel: source.recommendedMinLevel,
          recommendedMaxLevel: source.recommendedMaxLevel,
          dangerRating: source.dangerRating,
        },
      });

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: "MAP_CLONED",
        targetEntityType: "MapDefinition",
        targetEntityId: cloned.id,
        payloadJson: { sourceId: source.id, sourceName: source.name },
      });

      return cloned;
    }),

  archive: contentProcedure
    .input(z.object({ id: z.string(), isArchived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const map = await ctx.db.mapDefinition.findUnique({
        where: { id: input.id },
      });

      if (!map) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Map not found",
        });
      }

      const updated = await ctx.db.mapDefinition.update({
        where: { id: input.id },
        data: { isArchived: input.isArchived },
      });

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: input.isArchived ? "MAP_ARCHIVED" : "MAP_UNARCHIVED",
        targetEntityType: "MapDefinition",
        targetEntityId: input.id,
        payloadJson: {},
      });

      return updated;
    }),

  // MapVersion CRUD
  listVersions: contentProcedure
    .input(z.object({ mapId: z.string() }))
    .query(async ({ ctx, input }) => {
      const versions = await ctx.db.mapVersion.findMany({
        where: { mapId: input.mapId },
        orderBy: { versionNumber: "desc" },
      });

      return versions;
    }),

  createVersion: contentProcedure
    .input(
      z.object({
        mapId: z.string(),
        width: z.number().int().min(5).max(200),
        height: z.number().int().min(5).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const map = await ctx.db.mapDefinition.findUnique({
        where: { id: input.mapId },
      });

      if (!map) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Map not found",
        });
      }

      // Get next version number
      const lastVersion = await ctx.db.mapVersion.findFirst({
        where: { mapId: input.mapId },
        orderBy: { versionNumber: "desc" },
      });

      const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

      const version = await ctx.db.mapVersion.create({
        data: {
          mapId: input.mapId,
          versionNumber,
          width: input.width,
          height: input.height,
          status: "DRAFT",
        },
      });

      // Generate tiles for all positions
      const tiles: Prisma.MapVersionTileCreateManyInput[] = [];
      for (let y = 0; y < input.height; y++) {
        for (let x = 0; x < input.width; x++) {
          tiles.push({
            mapVersionId: version.id,
            x,
            y,
            tileType: "GROUND",
            overlay: "NONE",
            isWalkable: true,
            movementCost: 1,
            safeZone: false,
            fogDiscoverable: true,
          });
        }
      }

      await ctx.db.mapVersionTile.createMany({
        data: tiles,
      });

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: "MAP_VERSION_CREATED",
        targetEntityType: "MapVersion",
        targetEntityId: version.id,
        payloadJson: { mapId: input.mapId, versionNumber, width: input.width, height: input.height },
      });

      return version;
    }),

  cloneVersion: contentProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.mapVersion.findUnique({
        where: { id: input.versionId },
        include: {
          tiles: true,
          zones: true,
          pois: true,
        },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version not found",
        });
      }

      // Get next version number
      const lastVersion = await ctx.db.mapVersion.findFirst({
        where: { mapId: source.mapId },
        orderBy: { versionNumber: "desc" },
      });

      const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

      const cloned = await ctx.db.$transaction(async (tx) => {
        const newVersion = await tx.mapVersion.create({
          data: {
            mapId: source.mapId,
            versionNumber,
            width: source.width,
            height: source.height,
            status: "DRAFT",
            changeNotes: `Cloned from version ${source.versionNumber}`,
          },
        });

        // Copy tiles
        if (source.tiles.length > 0) {
          await tx.mapVersionTile.createMany({
            data: source.tiles.map((tile) => ({
              mapVersionId: newVersion.id,
              x: tile.x,
              y: tile.y,
              tileType: tile.tileType,
              overlay: tile.overlay,
              isWalkable: tile.isWalkable,
              movementCost: tile.movementCost,
              safeZone: tile.safeZone,
              fogDiscoverable: tile.fogDiscoverable,
              encounterDefinitionId: tile.encounterDefinitionId,
              resourceNodeId: tile.resourceNodeId,
              questTriggerId: tile.questTriggerId,
              notes: tile.notes,
              tagsJson: tile.tagsJson,
            })),
          });
        }

        // Copy zones
        if (source.zones.length > 0) {
          await tx.mapZoneVersion.createMany({
            data: source.zones.map((zone) => ({
              mapVersionId: newVersion.id,
              name: zone.name,
              slug: zone.slug,
              minX: zone.minX,
              minY: zone.minY,
              maxX: zone.maxX,
              maxY: zone.maxY,
              recommendedMinLevel: zone.recommendedMinLevel,
              recommendedMaxLevel: zone.recommendedMaxLevel,
              dangerRating: zone.dangerRating,
              defaultEncounterDefinitionId: zone.defaultEncounterDefinitionId,
              defaultResourceNodeId: zone.defaultResourceNodeId,
            })),
          });
        }

        // Copy POIs
        if (source.pois.length > 0) {
          await tx.mapPOI.createMany({
            data: source.pois.map((poi) => ({
              mapVersionId: newVersion.id,
              type: poi.type,
              name: poi.name,
              x: poi.x,
              y: poi.y,
              icon: poi.icon,
              destinationMapVersionId: poi.destinationMapVersionId,
              destinationX: poi.destinationX,
              destinationY: poi.destinationY,
              notes: poi.notes,
            })),
          });
        }

        return newVersion;
      });

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: "MAP_VERSION_CLONED",
        targetEntityType: "MapVersion",
        targetEntityId: cloned.id,
        payloadJson: { sourceVersionId: input.versionId, sourceVersionNumber: source.versionNumber },
      });

      return cloned;
    }),

  publishVersion: contentProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.db.mapVersion.findUnique({
        where: { id: input.versionId },
        include: { map: true },
      });

      if (!version) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version not found",
        });
      }

      if (version.status === "PUBLISHED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Version is already published",
        });
      }

      if (version.status === "ARCHIVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot publish archived version",
        });
      }

      const result = await ctx.db.$transaction(async (tx) => {
        // Unpublish any other published version for this map
        await tx.mapVersion.updateMany({
          where: {
            mapId: version.mapId,
            status: "PUBLISHED",
          },
          data: {
            status: "DRAFT",
            publishedAt: null,
          },
        });

        // Publish this version
        const published = await tx.mapVersion.update({
          where: { id: input.versionId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
        });

        return published;
      });

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: "MAP_VERSION_PUBLISHED",
        targetEntityType: "MapVersion",
        targetEntityId: input.versionId,
        payloadJson: { mapId: version.mapId, versionNumber: version.versionNumber },
      });

      return result;
    }),

  // Tile operations
  getTiles: contentProcedure
    .input(
      z.object({
        versionId: z.string(),
        minX: z.number().int().optional(),
        minY: z.number().int().optional(),
        maxX: z.number().int().optional(),
        maxY: z.number().int().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const version = await ctx.db.mapVersion.findUnique({
        where: { id: input.versionId },
      });

      if (!version) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version not found",
        });
      }

      const where: Prisma.MapVersionTileWhereInput = {
        mapVersionId: input.versionId,
        ...(input.minX !== undefined && { x: { gte: input.minX } }),
        ...(input.maxX !== undefined && { x: { lte: input.maxX } }),
        ...(input.minY !== undefined && { y: { gte: input.minY } }),
        ...(input.maxY !== undefined && { y: { lte: input.maxY } }),
      };

      const tiles = await ctx.db.mapVersionTile.findMany({
        where,
        orderBy: [{ y: "asc" }, { x: "asc" }],
      });

      return tiles;
    }),

  updateTilesBulk: contentProcedure
    .input(
      z.object({
        versionId: z.string(),
        changes: z.array(
          z.object({
            x: z.number().int(),
            y: z.number().int(),
            patch: z.object({
              tileType: tileTypeSchema.optional(),
              overlay: tileOverlaySchema.optional(),
              isWalkable: z.boolean().optional(),
              movementCost: z.number().int().optional(),
              safeZone: z.boolean().optional(),
              fogDiscoverable: z.boolean().optional(),
              encounterDefinitionId: z.string().nullable().optional(),
              resourceNodeId: z.string().nullable().optional(),
              questTriggerId: z.string().nullable().optional(),
              notes: z.string().nullable().optional(),
              tagsJson: z.unknown().optional(),
            }),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.db.mapVersion.findUnique({
        where: { id: input.versionId },
      });

      if (!version) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version not found",
        });
      }

      if (version.status !== "DRAFT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot edit tiles on non-draft version",
        });
      }

      // Validate coordinates
      for (const change of input.changes) {
        if (change.x < 0 || change.x >= version.width || change.y < 0 || change.y >= version.height) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid coordinates: (${change.x}, ${change.y})`,
          });
        }
      }

      // Bulk update tiles
      await ctx.db.$transaction(
        input.changes.map((change) =>
          ctx.db.mapVersionTile.updateMany({
            where: {
              mapVersionId: input.versionId,
              x: change.x,
              y: change.y,
            },
            data: change.patch as Prisma.MapVersionTileUpdateManyMutationInput,
          })
        )
      );

      // Log audit (avoid logging every tile; log counts + bounding box)
      const minX = Math.min(...input.changes.map((c) => c.x));
      const maxX = Math.max(...input.changes.map((c) => c.x));
      const minY = Math.min(...input.changes.map((c) => c.y));
      const maxY = Math.max(...input.changes.map((c) => c.y));

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: "MAP_TILES_UPDATED",
        targetEntityType: "MapVersion",
        targetEntityId: input.versionId,
        payloadJson: {
          tileCount: input.changes.length,
          bounds: { minX, maxX, minY, maxY },
        },
      });

      return { success: true, updated: input.changes.length };
    }),

  fillRect: contentProcedure
    .input(
      z.object({
        versionId: z.string(),
        minX: z.number().int(),
        minY: z.number().int(),
        maxX: z.number().int(),
        maxY: z.number().int(),
        patch: z.object({
          tileType: tileTypeSchema.optional(),
          overlay: tileOverlaySchema.optional(),
          isWalkable: z.boolean().optional(),
          movementCost: z.number().int().optional(),
          safeZone: z.boolean().optional(),
          fogDiscoverable: z.boolean().optional(),
          encounterDefinitionId: z.string().nullable().optional(),
          resourceNodeId: z.string().nullable().optional(),
          questTriggerId: z.string().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.db.mapVersion.findUnique({
        where: { id: input.versionId },
      });

      if (!version) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version not found",
        });
      }

      if (version.status !== "DRAFT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot edit tiles on non-draft version",
        });
      }

      // Validate bounds
      if (
        input.minX < 0 ||
        input.minY < 0 ||
        input.maxX >= version.width ||
        input.maxY >= version.height ||
        input.minX > input.maxX ||
        input.minY > input.maxY
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid rectangle bounds",
        });
      }

      const result = await ctx.db.mapVersionTile.updateMany({
        where: {
          mapVersionId: input.versionId,
          x: { gte: input.minX, lte: input.maxX },
          y: { gte: input.minY, lte: input.maxY },
        },
        data: input.patch as Prisma.MapVersionTileUpdateManyMutationInput,
      });

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: "MAP_TILES_FILLED",
        targetEntityType: "MapVersion",
        targetEntityId: input.versionId,
        payloadJson: {
          bounds: { minX: input.minX, maxX: input.maxX, minY: input.minY, maxY: input.maxY },
          tileCount: result.count,
        },
      });

      return { success: true, updated: result.count };
    }),

  copyRegion: contentProcedure
    .input(
      z.object({
        versionId: z.string(),
        minX: z.number().int(),
        minY: z.number().int(),
        maxX: z.number().int(),
        maxY: z.number().int(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tiles = await ctx.db.mapVersionTile.findMany({
        where: {
          mapVersionId: input.versionId,
          x: { gte: input.minX, lte: input.maxX },
          y: { gte: input.minY, lte: input.maxY },
        },
        orderBy: [{ y: "asc" }, { x: "asc" }],
      });

      return {
        tiles: tiles.map((t) => ({
          x: t.x - input.minX,
          y: t.y - input.minY,
          tileType: t.tileType,
          overlay: t.overlay,
          isWalkable: t.isWalkable,
          movementCost: t.movementCost,
          safeZone: t.safeZone,
          fogDiscoverable: t.fogDiscoverable,
          encounterDefinitionId: t.encounterDefinitionId,
          resourceNodeId: t.resourceNodeId,
          questTriggerId: t.questTriggerId,
          notes: t.notes,
          tagsJson: t.tagsJson,
        })),
        width: input.maxX - input.minX + 1,
        height: input.maxY - input.minY + 1,
      };
    }),

  pasteRegion: contentProcedure
    .input(
      z.object({
        versionId: z.string(),
        originX: z.number().int(),
        originY: z.number().int(),
        regionJson: z.object({
          tiles: z.array(
            z.object({
              x: z.number().int(),
              y: z.number().int(),
              tileType: tileTypeSchema,
              overlay: tileOverlaySchema,
              isWalkable: z.boolean(),
              movementCost: z.number().int(),
              safeZone: z.boolean(),
              fogDiscoverable: z.boolean(),
              encounterDefinitionId: z.string().nullable().optional(),
              resourceNodeId: z.string().nullable().optional(),
              questTriggerId: z.string().nullable().optional(),
              notes: z.string().nullable().optional(),
              tagsJson: z.unknown().optional(),
            })
          ),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.db.mapVersion.findUnique({
        where: { id: input.versionId },
      });

      if (!version) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version not found",
        });
      }

      if (version.status !== "DRAFT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot edit tiles on non-draft version",
        });
      }

      // Update tiles
      await ctx.db.$transaction(
        input.regionJson.tiles.map((tile) =>
          ctx.db.mapVersionTile.updateMany({
            where: {
              mapVersionId: input.versionId,
              x: input.originX + tile.x,
              y: input.originY + tile.y,
            },
            data: {
              tileType: tile.tileType,
              overlay: tile.overlay,
              isWalkable: tile.isWalkable,
              movementCost: tile.movementCost,
              safeZone: tile.safeZone,
              fogDiscoverable: tile.fogDiscoverable,
              encounterDefinitionId: tile.encounterDefinitionId ?? null,
              resourceNodeId: tile.resourceNodeId ?? null,
              questTriggerId: tile.questTriggerId ?? null,
              notes: tile.notes ?? null,
              tagsJson: tile.tagsJson ?? null,
            } as Prisma.MapVersionTileUpdateManyMutationInput,
          })
        )
      );

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: "MAP_REGION_PASTED",
        targetEntityType: "MapVersion",
        targetEntityId: input.versionId,
        payloadJson: {
          origin: { x: input.originX, y: input.originY },
          tileCount: input.regionJson.tiles.length,
        },
      });

      return { success: true, pasted: input.regionJson.tiles.length };
    }),

  // Zone operations (simple CRUD)
  listZones: contentProcedure
    .input(z.object({ versionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mapZoneVersion.findMany({
        where: { mapVersionId: input.versionId },
        orderBy: { name: "asc" },
      });
    }),

  createZone: contentProcedure
    .input(
      z.object({
        versionId: z.string(),
        name: z.string().min(1),
        slug: z.string().min(1),
        minX: z.number().int(),
        minY: z.number().int(),
        maxX: z.number().int(),
        maxY: z.number().int(),
        recommendedMinLevel: z.number().int().optional(),
        recommendedMaxLevel: z.number().int().optional(),
        dangerRating: z.number().int().optional(),
        defaultEncounterDefinitionId: z.string().nullable().optional(),
        defaultResourceNodeId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.db.mapVersion.findUnique({
        where: { id: input.versionId },
      });

      if (!version || version.status !== "DRAFT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only create zones on draft versions",
        });
      }

      return ctx.db.mapZoneVersion.create({
        data: input,
      });
    }),

  updateZone: contentProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        minX: z.number().int().optional(),
        minY: z.number().int().optional(),
        maxX: z.number().int().optional(),
        maxY: z.number().int().optional(),
        recommendedMinLevel: z.number().int().nullable().optional(),
        recommendedMaxLevel: z.number().int().nullable().optional(),
        dangerRating: z.number().int().nullable().optional(),
        defaultEncounterDefinitionId: z.string().nullable().optional(),
        defaultResourceNodeId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const zone = await ctx.db.mapZoneVersion.findUnique({
        where: { id },
        include: { mapVersion: true },
      });

      if (!zone || zone.mapVersion.status !== "DRAFT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only update zones on draft versions",
        });
      }

      return ctx.db.mapZoneVersion.update({
        where: { id },
        data: patch,
      });
    }),

  deleteZone: contentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const zone = await ctx.db.mapZoneVersion.findUnique({
        where: { id },
        include: { mapVersion: true },
      });

      if (!zone || zone.mapVersion.status !== "DRAFT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only delete zones on draft versions",
        });
      }

      await ctx.db.mapZoneVersion.delete({
        where: { id },
      });

      return { success: true };
    }),

  // POI operations (simple CRUD)
  listPois: contentProcedure
    .input(z.object({ versionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mapPOI.findMany({
        where: { mapVersionId: input.versionId },
        orderBy: [{ y: "asc" }, { x: "asc" }],
      });
    }),

  createPoi: contentProcedure
    .input(
      z.object({
        versionId: z.string(),
        type: poiTypeSchema,
        name: z.string().min(1),
        x: z.number().int(),
        y: z.number().int(),
        icon: z.string().optional(),
        destinationMapVersionId: z.string().nullable().optional(),
        destinationX: z.number().int().nullable().optional(),
        destinationY: z.number().int().nullable().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.db.mapVersion.findUnique({
        where: { id: input.versionId },
      });

      if (!version || version.status !== "DRAFT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only create POIs on draft versions",
        });
      }

      return ctx.db.mapPOI.create({
        data: input,
      });
    }),

  updatePoi: contentProcedure
    .input(
      z.object({
        id: z.string(),
        type: poiTypeSchema.optional(),
        name: z.string().min(1).optional(),
        x: z.number().int().optional(),
        y: z.number().int().optional(),
        icon: z.string().nullable().optional(),
        destinationMapVersionId: z.string().nullable().optional(),
        destinationX: z.number().int().nullable().optional(),
        destinationY: z.number().int().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const poi = await ctx.db.mapPOI.findUnique({
        where: { id },
        include: { mapVersion: true },
      });

      if (!poi || poi.mapVersion.status !== "DRAFT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only update POIs on draft versions",
        });
      }

      return ctx.db.mapPOI.update({
        where: { id },
        data: patch,
      });
    }),

  deletePoi: contentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const poi = await ctx.db.mapPOI.findUnique({
        where: { id },
        include: { mapVersion: true },
      });

      if (!poi || poi.mapVersion.status !== "DRAFT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only delete POIs on draft versions",
        });
      }

      await ctx.db.mapPOI.delete({
        where: { id },
      });

      return { success: true };
    }),

  // Get version details
  getVersion: contentProcedure
    .input(z.object({ versionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const version = await ctx.db.mapVersion.findUnique({
        where: { id: input.versionId },
        include: {
          map: true,
          _count: {
            select: {
              tiles: true,
              zones: true,
              pois: true,
            },
          },
        },
      });

      if (!version) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version not found",
        });
      }

      return version;
    }),
});
