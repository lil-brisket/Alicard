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

const itemTypeSchema = z.enum([
  "WEAPON",
  "ARMOR",
  "ACCESSORY",
  "CONSUMABLE",
  "MATERIAL",
  "QUEST_ITEM",
  "TOOL",
  "EQUIPMENT",
  "QUEST",
  "CURRENCY",
  "KEY",
  "MISC",
]);

const equipmentSlotSchema = z.enum([
  "HEAD",
  "ARMS",
  "BODY",
  "LEGS",
  "FEET",
  "RING",
  "NECKLACE",
  "BELT",
  "CLOAK",
  "OFFHAND",
  "MAINHAND",
]);

const contentStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED"]);

const itemStatsSchema = z.object({
  vitality: z.number().optional(),
  strength: z.number().optional(),
  speed: z.number().optional(),
  dexterity: z.number().optional(),
  hp: z.number().optional(),
  sp: z.number().optional(),
  defense: z.number().optional(),
}).optional();

export const contentItemsRouter = createTRPCRouter({
  // List all items with filtering
  list: contentProcedure
    .input(
      z.object({
        type: itemTypeSchema.optional(),
        query: z.string().optional(),
        isActive: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      
      if (input.type) {
        where.itemType = input.type;
      }
      
      if (input.isActive !== undefined) {
        where.isActive = input.isActive;
      }
      
      if (input.query) {
        where.OR = [
          { name: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
          { key: { contains: input.query, mode: "insensitive" } },
        ];
      }

      let items = await ctx.db.item.findMany({
        where,
        take: input.limit * 2, // Fetch more to account for tag filtering
        orderBy: {
          createdAt: "desc",
        },
      });

      // Filter by tags in memory (Prisma array filtering)
      if (input.tags && input.tags.length > 0) {
        items = items.filter((item) => {
          const itemTags = item.tags ?? [];
          return input.tags!.some((tag) => itemTags.includes(tag));
        });
      }

      // Limit after filtering
      return items.slice(0, input.limit);
    }),

  // Get item by ID
  get: contentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.item.findUnique({
        where: { id: input.id },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found",
        });
      }

      return item;
    }),

  // Create new item (requires content.create permission)
  create: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.create");
      return next({ ctx });
    })
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        key: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        itemType: itemTypeSchema.default("MATERIAL"),
        equipmentSlot: equipmentSlotSchema.optional().nullable(),
        rarity: itemRaritySchema.default("COMMON"),
        stackable: z.boolean().default(false),
        maxStack: z.number().min(1).default(999),
        value: z.number().min(0).default(0),
        isTradeable: z.boolean().default(true),
        isActive: z.boolean().default(true),
        vitalityBonus: z.number().default(0),
        strengthBonus: z.number().default(0),
        speedBonus: z.number().default(0),
        dexterityBonus: z.number().default(0),
        hpBonus: z.number().default(0),
        spBonus: z.number().default(0),
        defenseBonus: z.number().default(0),
        tier: z.number().int().min(1).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validation: if type === EQUIPMENT then equipSlot must be set
      if (input.itemType === "EQUIPMENT" && !input.equipmentSlot) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Equipment items must have an equipment slot specified",
        });
      }
      
      // Validation: if type !== EQUIPMENT then equipSlot must be null
      if (input.itemType !== "EQUIPMENT" && input.equipmentSlot !== null) {
        input.equipmentSlot = null;
      }

      try {
        const item = await ctx.db.item.create({
          data: {
            name: input.name,
            key: input.key,
            description: input.description,
            tags: input.tags ?? [],
            itemType: input.itemType,
            equipmentSlot: input.equipmentSlot,
            itemRarity: input.rarity,
            stackable: input.stackable,
            maxStack: input.maxStack,
            value: input.value,
            isTradeable: input.isTradeable,
            isActive: input.isActive,
            vitalityBonus: input.vitalityBonus,
            strengthBonus: input.strengthBonus,
            speedBonus: input.speedBonus,
            dexterityBonus: input.dexterityBonus,
            hpBonus: input.hpBonus,
            spBonus: input.spBonus,
            defenseBonus: input.defenseBonus,
            tier: input.tier,
          },
        });

        return item;
      } catch (error: any) {
        console.error("Error creating item:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message || "Failed to create item",
          cause: error,
        });
      }
    }),

  // Update item (requires content.edit permission)
  update: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        key: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        itemType: itemTypeSchema.optional(),
        equipmentSlot: equipmentSlotSchema.optional().nullable(),
        rarity: itemRaritySchema.optional(),
        stackable: z.boolean().optional(),
        maxStack: z.number().min(1).optional(),
        value: z.number().min(0).optional(),
        isTradeable: z.boolean().optional(),
        isActive: z.boolean().optional(),
        vitalityBonus: z.number().optional(),
        strengthBonus: z.number().optional(),
        speedBonus: z.number().optional(),
        dexterityBonus: z.number().optional(),
        hpBonus: z.number().optional(),
        spBonus: z.number().optional(),
        defenseBonus: z.number().optional(),
        tier: z.number().int().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const item = await ctx.db.item.findUnique({
        where: { id },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found",
        });
      }

      // Validation: if type === EQUIPMENT then equipSlot must be set
      const newItemType = updateData.itemType ?? item.itemType;
      const newEquipSlot = updateData.equipmentSlot !== undefined ? updateData.equipmentSlot : item.equipmentSlot;
      
      if (newItemType === "EQUIPMENT" && !newEquipSlot) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Equipment items must have an equipment slot specified",
        });
      }
      
      // Validation: if type !== EQUIPMENT then equipSlot must be null
      if (newItemType !== "EQUIPMENT" && newEquipSlot !== null) {
        updateData.equipmentSlot = null;
      }
      
      const updatedItem = await ctx.db.item.update({
        where: { id },
        data: updateData,
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
          itemType: source.itemType,
          equipmentSlot: source.equipmentSlot,
          rarity: source.rarity,
          stackable: source.stackable,
          maxStack: source.maxStack,
          value: source.value,
          damage: source.damage,
          statsJSON: source.statsJSON,
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

  // Sync runtime Item with template (updates existing Item to match template stats)
  syncItem: contentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.itemTemplate.findUnique({
        where: { id: input.id },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item template not found",
        });
      }

      const itemKey = `template_${template.id}`;
      const existingItem = await ctx.db.item.findUnique({
        where: { key: itemKey },
      });

      if (!existingItem) {
        return { synced: false, message: "No runtime item exists for this template" };
      }

      const stats = (template.statsJSON as {
        vitality?: number;
        strength?: number;
        speed?: number;
        dexterity?: number;
        hp?: number;
        sp?: number;
        defense?: number;
      } | null) ?? {};

      await ctx.db.item.update({
        where: { id: existingItem.id },
        data: {
          name: template.name,
          description: template.description,
          itemType: template.itemType ?? "CONSUMABLE",
          itemRarity: template.rarity,
          value: template.value,
          stackable: template.stackable,
          maxStack: template.maxStack,
          equipmentSlot: template.equipmentSlot,
          vitalityBonus: stats.vitality ?? 0,
          strengthBonus: stats.strength ?? 0,
          speedBonus: stats.speed ?? 0,
          dexterityBonus: stats.dexterity ?? 0,
          hpBonus: stats.hp ?? 0,
          spBonus: stats.sp ?? 0,
          defenseBonus: stats.defense ?? 0,
        },
      });

      return { synced: true, message: "Item synced successfully" };
    }),

  // Search items by name (for item picker)
  search: contentProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.item.findMany({
        where: {
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { key: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          key: true,
          itemType: true,
          description: true,
        },
        take: input.limit,
        orderBy: { name: "asc" },
      });

      return items.map((item) => ({
        id: item.id,
        name: item.name,
        key: item.key,
        sourceType: item.itemType,
        description: item.description,
      }));
    }),

  // Get item usage (recipes that use this item)
  getUsage: contentProcedure
    .input(z.object({ itemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [recipesAsInput, recipesAsOutput] = await Promise.all([
        ctx.db.recipe.findMany({
          where: {
            inputs: {
              some: {
                itemId: input.itemId,
              },
            },
          },
          select: {
            id: true,
            name: true,
            job: {
              select: {
                name: true,
              },
            },
          },
        }),
        ctx.db.recipe.findMany({
          where: {
            outputItemId: input.itemId,
          },
          select: {
            id: true,
            name: true,
            job: {
              select: {
                name: true,
              },
            },
          },
        }),
      ]);

      return {
        usedInRecipesCount: recipesAsInput.length + recipesAsOutput.length,
        usedInRecipes: [
          ...recipesAsInput.map((r) => ({
            id: r.id,
            name: r.name,
            jobName: r.job.name,
            role: "input" as const,
          })),
          ...recipesAsOutput.map((r) => ({
            id: r.id,
            name: r.name,
            jobName: r.job.name,
            role: "output" as const,
          })),
        ],
      };
    }),
});
