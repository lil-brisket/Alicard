import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";
import { requireContentPermission } from "~/server/lib/admin-auth";

export const contentGatheringNodeYieldsRouter = createTRPCRouter({
  // List yields for a node
  list: contentProcedure
    .input(z.object({ nodeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const node = await ctx.db.gatheringNode.findUnique({
        where: { id: input.nodeId },
      });

      if (!node) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gathering node not found",
        });
      }

      return await ctx.db.nodeYield.findMany({
        where: { nodeId: input.nodeId },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              itemType: true,
              description: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }),

  // Add yield to a node
  add: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        nodeId: z.string(),
        itemId: z.string(),
        minQty: z.number().int().min(1),
        maxQty: z.number().int().min(1),
        chance: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate minQty <= maxQty
      if (input.minQty > input.maxQty) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "minQty must be less than or equal to maxQty",
        });
      }

      // Verify node exists and is active
      const node = await ctx.db.gatheringNode.findUnique({
        where: { id: input.nodeId },
      });

      if (!node) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gathering node not found",
        });
      }

      if (!node.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add yields to inactive nodes",
        });
      }

      // Verify item exists
      const item = await ctx.db.item.findUnique({
        where: { id: input.itemId },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found",
        });
      }

      // Warn if item is inactive (but allow it for backwards compatibility)
      if (!item.isActive) {
        // Log warning but don't block
        console.warn(`Adding inactive item ${item.name} to node ${node.name}`);
      }

      try {
        const yield_ = await ctx.db.nodeYield.create({
          data: {
            nodeId: input.nodeId,
            itemId: input.itemId,
            minQty: input.minQty,
            maxQty: input.maxQty,
            chance: input.chance ?? null,
            weight: 100, // Legacy field, kept for backwards compatibility
          },
        });

        return yield_;
      } catch (error: any) {
        console.error("Error adding node yield:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message || "Failed to add node yield",
          cause: error,
        });
      }
    }),

  // Update yield
  update: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        id: z.string(),
        minQty: z.number().int().min(1).optional(),
        maxQty: z.number().int().min(1).optional(),
        chance: z.number().min(0).max(1).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const yield_ = await ctx.db.nodeYield.findUnique({
        where: { id },
        include: {
          node: true,
        },
      });

      if (!yield_) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Node yield not found",
        });
      }

      // Validate minQty <= maxQty if both are provided
      const newMinQty = updateData.minQty ?? yield_.minQty;
      const newMaxQty = updateData.maxQty ?? yield_.maxQty;
      
      if (newMinQty > newMaxQty) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "minQty must be less than or equal to maxQty",
        });
      }

      // Clamp chance to 0 < chance <= 1 if provided
      if (updateData.chance !== undefined) {
        if (updateData.chance !== null) {
          if (updateData.chance <= 0 || updateData.chance > 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "chance must be between 0 and 1 (exclusive of 0)",
            });
          }
        }
      }

      const updatedYield = await ctx.db.nodeYield.update({
        where: { id },
        data: updateData,
      });

      return updatedYield;
    }),

  // Remove yield
  remove: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const yield_ = await ctx.db.nodeYield.findUnique({
        where: { id: input.id },
      });

      if (!yield_) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Node yield not found",
        });
      }

      await ctx.db.nodeYield.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});

