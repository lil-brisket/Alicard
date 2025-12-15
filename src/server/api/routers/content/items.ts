import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";
import { requireContentPermission } from "~/server/lib/admin-auth";

const itemRaritySchema = z.enum([
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
]);

const contentStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED"]);

export const contentItemsRouter = createTRPCRouter({
  // List all item templates with filtering
  list: contentProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
        status: contentStatusSchema.optional(),
        tags: z.array(z.string()).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      
      if (!input.includeArchived) {
        where.isArchived = false;
      }
      
      if (input.status) {
        where.status = input.status;
      }
      
      // Note: Tag filtering with JSON in Prisma is limited
      // For now, we'll filter in memory after fetching
      // TODO: Consider using a separate Tag model for better filtering
      
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      let items = await ctx.db.itemTemplate.findMany({
        where,
        take: input.limit * 2, // Fetch more to account for tag filtering
        orderBy: {
          createdAt: "desc",
        },
      });

      // Filter by tags in memory (Prisma JSON filtering is limited)
      if (input.tags && input.tags.length > 0) {
        items = items.filter((item) => {
          const itemTags = (item.tags as string[] | null) ?? [];
          return input.tags!.some((tag) => itemTags.includes(tag));
        });
      }

      // Limit after filtering
      return items.slice(0, input.limit);
    }),

  // Get item template by ID
  get: contentProcedure
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

  // Create new item template (requires content.create permission)
  create: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.create");
      return next({ ctx });
    })
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: contentStatusSchema.default("DRAFT"),
        rarity: itemRaritySchema,
        stackable: z.boolean().default(false),
        maxStack: z.number().min(1).default(1),
        value: z.number().min(0).default(0),
        icon: z.string().optional(),
        cloneFromId: z.string().optional(), // For inheritance/cloning
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { cloneFromId, ...data } = input;
      
      let baseData: any = {
        ...data,
        tags: input.tags ? input.tags : [],
        version: 1,
        createdBy: ctx.session.user.id,
      };
      
      // If cloning, copy data from source
      if (cloneFromId) {
        const source = await ctx.db.itemTemplate.findUnique({
          where: { id: cloneFromId },
        });
        
        if (!source) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Source item template not found",
          });
        }
        
        baseData = {
          ...baseData,
          rarity: source.rarity,
          stackable: source.stackable,
          maxStack: source.maxStack,
          value: source.value,
          icon: source.icon,
          // Don't copy name, description, tags, status - those should be new
        };
      }

      const item = await ctx.db.itemTemplate.create({
        data: baseData,
      });

      return item;
    }),

  // Update item template (requires content.edit permission)
  update: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        status: contentStatusSchema.optional(),
        rarity: itemRaritySchema.optional(),
        stackable: z.boolean().optional(),
        maxStack: z.number().min(1).optional(),
        value: z.number().min(0).optional(),
        icon: z.string().optional().nullable(),
        affectsExisting: z.boolean().default(false), // Versioning: if false, only affects new items
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, affectsExisting, ...updateData } = input;

      const item = await ctx.db.itemTemplate.findUnique({
        where: { id },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item template not found",
        });
      }

      // If not affecting existing items, increment version
      const versionIncrement = affectsExisting ? 0 : 1;
      
      const updatedItem = await ctx.db.itemTemplate.update({
        where: { id },
        data: {
          ...updateData,
          version: item.version + versionIncrement,
        },
      });

      return updatedItem;
    }),

  // Disable item template (requires content.disable permission)
  disable: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.disable");
      return next({ ctx });
    })
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
          status: "DISABLED",
        },
      });

      return updatedItem;
    }),

  // Archive item template (soft delete - legacy support)
  archive: contentProcedure
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
          status: "DISABLED",
        },
      });

      return updatedItem;
    }),

  // Enable item template (set status to ACTIVE)
  enable: contentProcedure
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
          status: "ACTIVE",
        },
      });

      return updatedItem;
    }),

  // Unarchive item template (legacy support)
  unarchive: contentProcedure
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
          status: "ACTIVE",
        },
      });

      return updatedItem;
    }),

  // Clone item template (inheritance)
  clone: contentProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.itemTemplate.findUnique({
        where: { id: input.id },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source item template not found",
        });
      }

      const cloned = await ctx.db.itemTemplate.create({
        data: {
          name: input.name,
          description: input.description ?? source.description,
          tags: input.tags ?? (source.tags as string[] | null) ?? [],
          status: "DRAFT",
          version: 1,
          createdBy: ctx.session.user.id,
          rarity: source.rarity,
          stackable: source.stackable,
          maxStack: source.maxStack,
          value: source.value,
          icon: source.icon,
        },
      });

      return cloned;
    }),

  // Bulk update by tags
  bulkUpdate: contentProcedure
    .input(
      z.object({
        tags: z.array(z.string()),
        updates: z.object({
          status: contentStatusSchema.optional(),
          value: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch all items with matching tags
      const allItems = await ctx.db.itemTemplate.findMany({
        select: { id: true, tags: true },
      });

      const matchingIds = allItems
        .filter((item) => {
          const itemTags = (item.tags as string[] | null) ?? [];
          return input.tags.some((tag) => itemTags.includes(tag));
        })
        .map((item) => item.id);

      if (matchingIds.length === 0) {
        return { count: 0 };
      }

      // Update matching items
      const result = await ctx.db.itemTemplate.updateMany({
        where: {
          id: { in: matchingIds },
        },
        data: input.updates,
      });

      return { count: result.count };
    }),

  // Hard delete (requires content.delete permission - ADMIN only)
  delete: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.delete");
      return next({ ctx });
    })
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

  // Get cross-references for an item (recipes, nodes, etc.)
  getReferences: contentProcedure
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

      // Find recipes that use this item as input
      const recipesAsInput = await ctx.db.recipe.findMany({
        where: {
          inputs: {
            some: {
              itemId: input.id,
            },
          },
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

      // Find recipes that output this item
      const recipesAsOutput = await ctx.db.recipe.findMany({
        where: {
          outputItemId: input.id,
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

      // Find nodes that yield this item
      const nodes = await ctx.db.gatheringNode.findMany({
        where: {
          yields: {
            some: {
              itemId: input.id,
            },
          },
        },
        select: {
          id: true,
          name: true,
          status: true,
          key: true,
        },
      });

      // Find shop items that sell this item
      const shopItems = await ctx.db.shopItem.findMany({
        where: {
          itemId: input.id,
        },
        select: {
          id: true,
          npc: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        recipesAsInput,
        recipesAsOutput,
        nodes,
        shopItems,
        warnings: [
          ...recipesAsInput.filter((r) => r.status === "DISABLED").map((r) => ({
            type: "recipe_input_disabled" as const,
            message: `Recipe "${r.name}" is disabled but uses this item`,
            id: r.id,
          })),
          ...recipesAsOutput.filter((r) => r.status === "DISABLED").map((r) => ({
            type: "recipe_output_disabled" as const,
            message: `Recipe "${r.name}" is disabled but outputs this item`,
            id: r.id,
          })),
          ...nodes.filter((n) => n.status === "DISABLED").map((n) => ({
            type: "node_disabled" as const,
            message: `Gathering node "${n.name}" is disabled but yields this item`,
            id: n.id,
          })),
        ],
      };
    }),
});
