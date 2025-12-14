import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
} from "~/server/api/trpc";

const itemRaritySchema = z.enum([
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
]);

export const contentItemsRouter = createTRPCRouter({
  // List all item templates (non-archived by default)
  list: adminProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.itemTemplate.findMany({
        where: {
          ...(input.includeArchived ? {} : { isArchived: false }),
        },
        take: input.limit,
        orderBy: {
          createdAt: "desc",
        },
      });

      return items;
    }),

  // Get item template by ID
  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.itemTemplate.findUnique({
        where: { id: input.id },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item template not found",
        });
      }

      return item;
    }),

  // Create new item template
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        rarity: itemRaritySchema,
        stackable: z.boolean().default(false),
        maxStack: z.number().min(1).default(1),
        value: z.number().min(0).default(0),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.itemTemplate.create({
        data: input,
      });

      return item;
    }),

  // Update item template
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        rarity: itemRaritySchema.optional(),
        stackable: z.boolean().optional(),
        maxStack: z.number().min(1).optional(),
        value: z.number().min(0).optional(),
        icon: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const item = await ctx.db.itemTemplate.findUnique({
        where: { id },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item template not found",
        });
      }

      const updatedItem = await ctx.db.itemTemplate.update({
        where: { id },
        data: updateData,
      });

      return updatedItem;
    }),

  // Archive item template (soft delete)
  archive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.itemTemplate.findUnique({
        where: { id: input.id },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item template not found",
        });
      }

      const updatedItem = await ctx.db.itemTemplate.update({
        where: { id: input.id },
        data: {
          isArchived: true,
          deletedAt: new Date(),
        },
      });

      return updatedItem;
    }),

  // Unarchive item template
  unarchive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.itemTemplate.findUnique({
        where: { id: input.id },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item template not found",
        });
      }

      const updatedItem = await ctx.db.itemTemplate.update({
        where: { id: input.id },
        data: {
          isArchived: false,
          deletedAt: null,
        },
      });

      return updatedItem;
    }),

  // Hard delete (only if safe - no references)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.itemTemplate.findUnique({
        where: { id: input.id },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item template not found",
        });
      }

      // TODO: Check for references in InventoryItem, Equipment, etc.
      // For now, we'll allow deletion but recommend archiving instead

      await ctx.db.itemTemplate.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
