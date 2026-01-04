import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";
import { requireContentPermission } from "~/server/lib/admin-auth";

export const contentGatheringNodesRouter = createTRPCRouter({
  // List gathering nodes with filtering
  list: contentProcedure
    .input(
      z.object({
        jobId: z.string().optional(),
        query: z.string().optional(),
        tier: z.number().int().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      
      if (input?.jobId) {
        where.jobId = input.jobId;
      }
      
      if (input?.tier !== undefined) {
        where.tier = input.tier;
      }
      
      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      }
      
      if (input?.query) {
        where.OR = [
          { name: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
          { key: { contains: input.query, mode: "insensitive" } },
        ];
      }

      return await ctx.db.gatheringNode.findMany({
        where,
        include: {
          job: true,
          yields: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  itemType: true,
                },
              },
            },
          },
        },
        orderBy: [
          { tier: "asc" },
          { requiredJobLevel: "asc" },
          { name: "asc" },
        ],
        take: input?.limit ?? 50,
      });
    }),

  // Get gathering node by ID
  get: contentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const node = await ctx.db.gatheringNode.findUnique({
        where: { id: input.id },
        include: {
          job: true,
          yields: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  itemType: true,
                  description: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!node) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gathering node not found",
        });
      }

      return node;
    }),

  // Create gathering node (requires content.create permission)
  create: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.create");
      return next({ ctx });
    })
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        key: z.string().min(1, "Key is required"),
        description: z.string().optional(),
        jobId: z.string().min(1, "Job ID is required"),
        tier: z.number().int().min(1).default(1),
        requiredJobLevel: z.number().int().min(1).default(1),
        gatherTimeSeconds: z.number().int().min(1).default(30),
        xpReward: z.number().int().min(0).default(10),
        dangerTier: z.number().int().min(1).default(1),
        cooldownSeconds: z.number().int().optional(),
        isActive: z.boolean().default(true),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify job exists
      const job = await ctx.db.job.findUnique({
        where: { id: input.jobId },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      // Check if key already exists
      const existing = await ctx.db.gatheringNode.findUnique({
        where: { key: input.key },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A gathering node with this key already exists",
        });
      }

      try {
        const node = await ctx.db.gatheringNode.create({
          data: {
            name: input.name,
            key: input.key,
            description: input.description,
            jobId: input.jobId,
            tier: input.tier,
            requiredJobLevel: input.requiredJobLevel,
            gatherTimeSeconds: input.gatherTimeSeconds,
            xpReward: input.xpReward,
            dangerTier: input.dangerTier,
            cooldownSeconds: input.cooldownSeconds,
            isActive: input.isActive,
            tags: input.tags ?? [],
            status: "ACTIVE",
            version: 1,
            createdBy: ctx.session.user.id,
          },
        });

        return node;
      } catch (error: any) {
        console.error("Error creating gathering node:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message || "Failed to create gathering node",
          cause: error,
        });
      }
    }),

  // Update gathering node (requires content.edit permission)
  update: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        key: z.string().optional(),
        description: z.string().optional().nullable(),
        jobId: z.string().optional(),
        tier: z.number().int().min(1).optional(),
        requiredJobLevel: z.number().int().min(1).optional(),
        gatherTimeSeconds: z.number().int().min(1).optional(),
        xpReward: z.number().int().min(0).optional(),
        dangerTier: z.number().int().min(1).optional(),
        cooldownSeconds: z.number().int().optional().nullable(),
        isActive: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const node = await ctx.db.gatheringNode.findUnique({
        where: { id },
      });

      if (!node) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gathering node not found",
        });
      }

      // Verify job exists if jobId is being updated
      if (updateData.jobId) {
        const job = await ctx.db.job.findUnique({
          where: { id: updateData.jobId },
        });

        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Job not found",
          });
        }
      }

      // Check if key already exists (if changing key)
      if (updateData.key && updateData.key !== node.key) {
        const existing = await ctx.db.gatheringNode.findUnique({
          where: { key: updateData.key },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A gathering node with this key already exists",
          });
        }
      }

      // Remove undefined values - Prisma doesn't accept undefined
      // For nullable fields, we need to explicitly pass null or omit them
      // Handle jobId using relation syntax for updates
      const { jobId, ...restUpdateData } = updateData;
      const cleanData: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(restUpdateData)) {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      }
      
      // Use relation syntax for jobId if it's being updated
      if (jobId !== undefined) {
        cleanData.job = { connect: { id: jobId } };
      }

      const updatedNode = await ctx.db.gatheringNode.update({
        where: { id },
        data: cleanData,
      });

      return updatedNode;
    }),

  // Delete gathering node (soft delete - sets isActive=false)
  delete: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const node = await ctx.db.gatheringNode.findUnique({
        where: { id: input.id },
      });

      if (!node) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gathering node not found",
        });
      }

      // Soft delete: set isActive=false
      const updatedNode = await ctx.db.gatheringNode.update({
        where: { id: input.id },
        data: {
          isActive: false,
          status: "DISABLED",
        },
      });

      return updatedNode;
    }),
});

