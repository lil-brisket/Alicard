import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "~/server/types/prisma";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";

export const contentMapsRouter = createTRPCRouter({
  // List all map zones
  list: contentProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const maps = await ctx.db.mapZone.findMany({
        where: {
          ...(input.includeArchived ? {} : { isArchived: false }),
        },
        take: input.limit,
        orderBy: {
          createdAt: "desc",
        },
      });

      return maps;
    }),

  // Get map zone by ID
  get: contentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const map = await ctx.db.mapZone.findUnique({
        where: { id: input.id },
      });

      if (!map) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Map zone not found",
        });
      }

      return map;
    }),

  // Create new map zone
  create: contentProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        width: z.number().min(1),
        height: z.number().min(1),
        tilesJSON: z.union([
          z.string().transform((str) => {
            try {
              return JSON.parse(str) as unknown;
            } catch {
              throw new Error("Invalid JSON for tiles");
            }
          }),
          z.record(z.string(), z.unknown()),
        ]),
        poisJSON: z
          .union([
            z.string().transform((str) => {
              try {
                return JSON.parse(str) as unknown;
              } catch {
                throw new Error("Invalid JSON for POIs");
              }
            }),
            z.array(z.unknown()),
          ])
          .optional(),
        spawnJSON: z
          .union([
            z.string().transform((str) => {
              try {
                return JSON.parse(str) as unknown;
              } catch {
                throw new Error("Invalid JSON for spawns");
              }
            }),
            z.record(z.string(), z.unknown()),
          ])
          .optional(),
        coinsReward: z.number().min(0).default(0),
        damageModifier: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tiles =
        typeof input.tilesJSON === "string"
          ? JSON.parse(input.tilesJSON)
          : input.tilesJSON;
      const pois =
        input.poisJSON !== undefined
          ? typeof input.poisJSON === "string"
            ? JSON.parse(input.poisJSON)
            : input.poisJSON
          : null;
      const spawns =
        input.spawnJSON !== undefined
          ? typeof input.spawnJSON === "string"
            ? JSON.parse(input.spawnJSON)
            : input.spawnJSON
          : null;

      const map = await ctx.db.mapZone.create({
        data: {
          name: input.name,
          width: input.width,
          height: input.height,
          tilesJSON: tiles as Prisma.InputJsonValue,
          poisJSON: pois as Prisma.InputJsonValue,
          spawnJSON: spawns as Prisma.InputJsonValue,
          coinsReward: input.coinsReward,
          damageModifier: input.damageModifier,
        },
      });

      return map;
    }),

  // Update map zone
  update: contentProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        width: z.number().min(1).optional(),
        height: z.number().min(1).optional(),
        tilesJSON: z
          .union([
            z.string().transform((str) => {
              try {
                return JSON.parse(str) as unknown;
              } catch {
                throw new Error("Invalid JSON for tiles");
              }
            }),
            z.record(z.string(), z.unknown()),
          ])
          .optional(),
        poisJSON: z
          .union([
            z.string().transform((str) => {
              try {
                return JSON.parse(str) as unknown;
              } catch {
                throw new Error("Invalid JSON for POIs");
              }
            }),
            z.array(z.unknown()),
          ])
          .optional()
          .nullable(),
        spawnJSON: z
          .union([
            z.string().transform((str) => {
              try {
                return JSON.parse(str) as unknown;
              } catch {
                throw new Error("Invalid JSON for spawns");
              }
            }),
            z.record(z.string(), z.unknown()),
          ])
          .optional()
          .nullable(),
        coinsReward: z.number().min(0).optional(),
        damageModifier: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, tilesJSON, poisJSON, spawnJSON, ...updateData } = input;

      const map = await ctx.db.mapZone.findUnique({
        where: { id },
      });

      if (!map) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Map zone not found",
        });
      }

      const updatePayload: {
        name?: string;
        width?: number;
        height?: number;
        tilesJSON?: unknown;
        poisJSON?: unknown | null;
        spawnJSON?: unknown | null;
      } = { ...updateData };

      if (tilesJSON !== undefined) {
        updatePayload.tilesJSON =
          typeof tilesJSON === "string"
            ? JSON.parse(tilesJSON)
            : tilesJSON;
      }

      if (poisJSON !== undefined) {
        updatePayload.poisJSON =
          poisJSON === null
            ? null
            : typeof poisJSON === "string"
              ? JSON.parse(poisJSON)
              : poisJSON;
      }

      if (spawnJSON !== undefined) {
        updatePayload.spawnJSON =
          spawnJSON === null
            ? null
            : typeof spawnJSON === "string"
              ? JSON.parse(spawnJSON)
              : spawnJSON;
      }

      const updatedMap = await ctx.db.mapZone.update({
        where: { id },
        data: {
          ...updateData,
          ...(tilesJSON !== undefined && {
            tilesJSON: (typeof tilesJSON === "string" ? JSON.parse(tilesJSON) : tilesJSON) as Prisma.InputJsonValue,
          }),
          ...(poisJSON !== undefined && {
            poisJSON: poisJSON === null ? Prisma.JsonNull : (typeof poisJSON === "string" ? JSON.parse(poisJSON) : poisJSON) as Prisma.InputJsonValue,
          }),
          ...(spawnJSON !== undefined && {
            spawnJSON: spawnJSON === null ? Prisma.JsonNull : (typeof spawnJSON === "string" ? JSON.parse(spawnJSON) : spawnJSON) as Prisma.InputJsonValue,
          }),
        },
      });

      return updatedMap;
    }),

  // Archive map zone
  archive: contentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const map = await ctx.db.mapZone.findUnique({
        where: { id: input.id },
      });

      if (!map) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Map zone not found",
        });
      }

      const updatedMap = await ctx.db.mapZone.update({
        where: { id: input.id },
        data: {
          isArchived: true,
          deletedAt: new Date(),
        },
      });

      return updatedMap;
    }),

  // Unarchive map zone
  unarchive: contentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const map = await ctx.db.mapZone.findUnique({
        where: { id: input.id },
      });

      if (!map) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Map zone not found",
        });
      }

      const updatedMap = await ctx.db.mapZone.update({
        where: { id: input.id },
        data: {
          isArchived: false,
          deletedAt: null,
        },
      });

      return updatedMap;
    }),

  // Hard delete
  delete: contentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const map = await ctx.db.mapZone.findUnique({
        where: { id: input.id },
      });

      if (!map) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Map zone not found",
        });
      }

      // TODO: Check for references

      await ctx.db.mapZone.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
