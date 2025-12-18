import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";
import { requireContentPermission } from "~/server/lib/admin-auth";

export const contentPlayerAssignmentRouter = createTRPCRouter({
  // Get player's skills
  getPlayerSkills: contentProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { id: input.playerId },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      const playerSkills = await ctx.db.playerSkill.findMany({
        where: { playerId: input.playerId },
        include: {
          skill: true,
        },
        orderBy: {
          learnedAt: "desc",
        },
      });

      return playerSkills;
    }),

  // List players for selection
  listPlayers: contentProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        isDeleted: false,
      };

      if (input.search) {
        where.OR = [
          { characterName: { contains: input.search, mode: "insensitive" } },
          { user: { username: { contains: input.search, mode: "insensitive" } } },
        ];
      }

      const players = await ctx.db.player.findMany({
        where,
        take: input.limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return players;
    }),

  // Assign item to player (creates Item instance from ItemTemplate and adds to inventory)
  assignItem: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.create");
      return next({ ctx });
    })
    .input(
      z.object({
        playerId: z.string(),
        itemTemplateId: z.string(),
        quantity: z.number().min(1).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify player exists
      const player = await ctx.db.player.findUnique({
        where: { id: input.playerId },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Get item template
      const template = await ctx.db.itemTemplate.findUnique({
        where: { id: input.itemTemplateId },
      });

      if (!template || template.status === "DISABLED") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item template not found or disabled",
        });
      }

      // Create a key for the Item instance (use template ID as key since it's unique)
      const itemKey = `template_${template.id}`;

      // Check if Item with this key already exists, if not create it
      let item = await ctx.db.item.findUnique({
        where: { key: itemKey },
      });

      if (!item) {
        // Create Item instance from template
        // Map ItemTemplate fields to Item fields
        // Extract stats from template's statsJSON
        const stats = (template.statsJSON as {
          vitality?: number;
          strength?: number;
          speed?: number;
          dexterity?: number;
          hp?: number;
          sp?: number;
          defense?: number;
        } | null) ?? {};

        item = await ctx.db.item.create({
          data: {
            key: itemKey,
            name: template.name,
            description: template.description,
            itemType: template.itemType ?? "CONSUMABLE", // Use itemType from template
            itemRarity: template.rarity,
            tier: 1, // Default tier
            value: template.value,
            stackable: template.stackable,
            maxStack: template.maxStack,
            equipmentSlot: template.equipmentSlot, // Copy equipment slot from template
            vitalityBonus: stats.vitality ?? 0,
            strengthBonus: stats.strength ?? 0,
            speedBonus: stats.speed ?? 0,
            dexterityBonus: stats.dexterity ?? 0,
            hpBonus: stats.hp ?? 0,
            spBonus: stats.sp ?? 0,
            defenseBonus: stats.defense ?? 0,
          },
        });
      }

      // Find existing inventory entry (schema has unique constraint on [playerId, itemId])
      const existingInventory = await ctx.db.inventoryItem.findFirst({
        where: {
          playerId: input.playerId,
          itemId: item.id,
        },
      });

      if (existingInventory) {
        // Add to existing entry
        const newQuantity = existingInventory.quantity + input.quantity;
        
        // Check stack limits if item is stackable
        if (item.stackable && newQuantity > item.maxStack) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot add ${input.quantity} items. Total would exceed max stack of ${item.maxStack}.`,
          });
        }
        
        // For non-stackable items, still increment quantity (schema allows it)
        // In a strict implementation, you might want to prevent quantity > 1 for non-stackables
        await ctx.db.inventoryItem.update({
          where: { id: existingInventory.id },
          data: {
            quantity: newQuantity,
          },
        });
      } else {
        // Create new inventory entry
        if (item.stackable && input.quantity > item.maxStack) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot add ${input.quantity} items. Quantity exceeds max stack of ${item.maxStack}.`,
          });
        }
        
        await ctx.db.inventoryItem.create({
          data: {
            playerId: input.playerId,
            itemId: item.id,
            quantity: input.quantity,
          },
        });
      }

      return { success: true, itemId: item.id };
    }),

  // Remove item from player inventory
  removeItem: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        playerId: z.string(),
        inventoryItemId: z.string(),
        quantity: z.number().min(1).optional(), // If not specified, remove the entire stack
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inventoryItem = await ctx.db.inventoryItem.findUnique({
        where: { id: input.inventoryItemId },
        include: { item: true },
      });

      if (!inventoryItem || inventoryItem.playerId !== input.playerId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inventory item not found",
        });
      }

      if (input.quantity) {
        // Remove specific quantity
        if (input.quantity > inventoryItem.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot remove ${input.quantity} items. Player only has ${inventoryItem.quantity}.`,
          });
        }

        if (input.quantity === inventoryItem.quantity) {
          // Remove entire stack
          await ctx.db.inventoryItem.delete({
            where: { id: input.inventoryItemId },
          });
        } else {
          // Update quantity
          await ctx.db.inventoryItem.update({
            where: { id: input.inventoryItemId },
            data: {
              quantity: inventoryItem.quantity - input.quantity,
            },
          });
        }
      } else {
        // Remove entire stack
        await ctx.db.inventoryItem.delete({
          where: { id: input.inventoryItemId },
        });
      }

      return { success: true };
    }),

  // Get player's inventory
  getPlayerInventory: contentProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { id: input.playerId },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      const inventoryItems = await ctx.db.inventoryItem.findMany({
        where: { playerId: input.playerId },
        include: {
          item: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return inventoryItems;
    }),

  // Assign skill to player
  assignSkill: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.create");
      return next({ ctx });
    })
    .input(
      z.object({
        playerId: z.string(),
        skillId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify player exists
      const player = await ctx.db.player.findUnique({
        where: { id: input.playerId },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Get skill template
      const skill = await ctx.db.skill.findUnique({
        where: { id: input.skillId },
      });

      if (!skill || skill.status === "DISABLED") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill template not found or disabled",
        });
      }

      // Assign skill (upsert to handle duplicates gracefully)
      await ctx.db.playerSkill.upsert({
        where: {
          playerId_skillId: {
            playerId: input.playerId,
            skillId: input.skillId,
          },
        },
        update: {
          // Already exists, no need to update
        },
        create: {
          playerId: input.playerId,
          skillId: input.skillId,
        },
      });

      return { success: true };
    }),

  // Remove skill from player
  removeSkill: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        playerId: z.string(),
        skillId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const playerSkill = await ctx.db.playerSkill.findUnique({
        where: {
          playerId_skillId: {
            playerId: input.playerId,
            skillId: input.skillId,
          },
        },
      });

      if (!playerSkill) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player does not have this skill",
        });
      }

      await ctx.db.playerSkill.delete({
        where: { id: playerSkill.id },
      });

      return { success: true };
    }),
});
