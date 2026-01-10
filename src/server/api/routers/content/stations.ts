import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";
import { requireContentPermission } from "~/server/lib/admin-auth";

const contentStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED", "PUBLISHED", "ARCHIVED"]);

export const contentStationsRouter = createTRPCRouter({
  // List stations with filtering
  list: contentProcedure
    .input(
      z.object({
        stationType: z.string().optional(), // e.g., "ALCHEMY", "BLACKSMITH"
        query: z.string().optional(),
        isEnabled: z.boolean().optional(),
        status: contentStatusSchema.optional(),
        unlockLevelMin: z.number().int().min(1).optional(),
        unlockLevelMax: z.number().int().max(100).optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.stationType) {
        where.stationType = input.stationType;
      }

      if (input?.isEnabled !== undefined) {
        where.isEnabled = input.isEnabled;
      }

      if (input?.status) {
        where.status = input.status;
      }

      if (input?.unlockLevelMin !== undefined || input?.unlockLevelMax !== undefined) {
        where.unlockLevel = {};
        if (input?.unlockLevelMin !== undefined) {
          where.unlockLevel.gte = input.unlockLevelMin;
        }
        if (input?.unlockLevelMax !== undefined) {
          where.unlockLevel.lte = input.unlockLevelMax;
        }
      }

      if (input?.query) {
        where.OR = [
          { name: { contains: input.query, mode: "insensitive" } },
          { key: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
        ];
      }

      return await ctx.db.stationDefinition.findMany({
        where,
        include: {
          _count: {
            select: { recipes: true },
          },
        },
        orderBy: [
          { unlockLevel: "asc" },
          { name: "asc" },
        ],
        take: input?.limit ?? 50,
      });
    }),

  // Get station by ID
  get: contentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const station = await ctx.db.stationDefinition.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { recipes: true },
          },
        },
      });

      if (!station) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Station not found",
        });
      }

      return station;
    }),

  // Get station by key
  getByKey: contentProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const station = await ctx.db.stationDefinition.findUnique({
        where: { key: input.key },
        include: {
          _count: {
            select: { recipes: true },
          },
        },
      });

      if (!station) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Station not found",
        });
      }

      return station;
    }),

  // Create new station (requires content.create permission)
  create: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.create");
      return next({ ctx });
    })
    .input(
      z.object({
        key: z.string().min(1, "Key is required").regex(/^[a-z0-9_-]+$/, "Key must be lowercase alphanumeric with dashes/underscores"),
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        stationType: z.string().min(1, "Station type is required"),
        unlockLevel: z.number().int().min(1).max(100).default(1),
        isEnabled: z.boolean().default(true),
        metadata: z.record(z.any()).optional(),
        status: contentStatusSchema.default("DRAFT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if key already exists
      const existing = await ctx.db.stationDefinition.findUnique({
        where: { key: input.key },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Station with key "${input.key}" already exists`,
        });
      }

      const station = await ctx.db.stationDefinition.create({
        data: {
          key: input.key,
          name: input.name,
          description: input.description,
          tags: input.tags ?? [],
          stationType: input.stationType,
          unlockLevel: input.unlockLevel,
          isEnabled: input.isEnabled,
          metadata: input.metadata ?? {},
          status: input.status,
          createdBy: ctx.session.user.id,
        },
      });

      return station;
    }),

  // Update station (requires content.edit permission)
  update: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        id: z.string(),
        key: z.string().regex(/^[a-z0-9_-]+$/).optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        stationType: z.string().optional(),
        unlockLevel: z.number().int().min(1).max(100).optional(),
        isEnabled: z.boolean().optional(),
        metadata: z.record(z.any()).optional(),
        status: contentStatusSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const existing = await ctx.db.stationDefinition.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Station not found",
        });
      }

      // Check key uniqueness if key is being updated
      if (input.key && input.key !== existing.key) {
        const keyExists = await ctx.db.stationDefinition.findUnique({
          where: { key: input.key },
        });

        if (keyExists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Station with key "${input.key}" already exists`,
          });
        }
      }

      const updated = await ctx.db.stationDefinition.update({
        where: { id },
        data: updateData,
      });

      return updated;
    }),

  // Delete station (requires content.delete permission - ADMIN only)
  delete: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.delete");
      return next({ ctx });
    })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const station = await ctx.db.stationDefinition.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { recipes: true },
          },
        },
      });

      if (!station) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Station not found",
        });
      }

      if (station._count.recipes > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete station: ${station._count.recipes} recipe(s) are using it`,
        });
      }

      // Soft delete: set status to ARCHIVED and isEnabled to false
      await ctx.db.stationDefinition.update({
        where: { id: input.id },
        data: {
          status: "ARCHIVED",
          isEnabled: false,
        },
      });

      return { success: true };
    }),
});
