import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { addItemToInventory, removeItemFromInventory } from "~/server/lib/inventory";

const equipmentSlotSchema = z.enum([
  "HEAD",
  "LEFT_ARM",
  "RIGHT_ARM",
  "BODY",
  "LEGS",
  "FEET",
  "RING1",
  "RING2",
  "RING3",
  "NECKLACE",
  "BELT",
  "CLOAK",
]);

const slotToFieldMap = {
  HEAD: "headItemId",
  LEFT_ARM: "leftArmItemId",
  RIGHT_ARM: "rightArmItemId",
  BODY: "bodyItemId",
  LEGS: "legsItemId",
  FEET: "feetItemId",
  RING1: "ring1ItemId",
  RING2: "ring2ItemId",
  RING3: "ring3ItemId",
  NECKLACE: "necklaceItemId",
  BELT: "beltItemId",
  CLOAK: "cloakItemId",
} as const;

// Helper function to infer equipmentSlot from itemType if missing
// This provides backward compatibility for items created without equipmentSlot
type ItemWithType = {
  itemType: "WEAPON" | "ARMOR" | "ACCESSORY" | "CONSUMABLE" | "MATERIAL" | "QUEST_ITEM" | "TOOL" | "EQUIPMENT";
  equipmentSlot: "HEAD" | "ARMS" | "BODY" | "LEGS" | "FEET" | "RING" | "NECKLACE" | "BELT" | "CLOAK" | null;
};

const getEffectiveEquipmentSlot = (item: ItemWithType): string | null => {
  // If equipmentSlot is already set, use it
  if (item.equipmentSlot) {
    return item.equipmentSlot;
  }
  
  // Infer from itemType for backward compatibility
  switch (item.itemType) {
    case "WEAPON":
      return "ARMS";
    case "ARMOR":
      // ARMOR could be BODY, HEAD, LEGS, or FEET - default to BODY
      return "BODY";
    case "ACCESSORY":
      // ACCESSORY could be RING, NECKLACE, BELT, or CLOAK - default to RING
      return "RING";
    case "EQUIPMENT":
      // EQUIPMENT is generic, default to BODY
      return "BODY";
    default:
      return null;
  }
};

export const equipmentRouter = createTRPCRouter({
  // Get current equipment loadout with items and stat bonuses
  getLoadout: protectedProcedure.query(async ({ ctx }) => {
    const player = await ctx.db.player.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        equipment: {
          include: {
            head: true,
            leftArm: true,
            rightArm: true,
            body: true,
            legs: true,
            feet: true,
            ring1: true,
            ring2: true,
            ring3: true,
            necklace: true,
            belt: true,
            cloak: true,
          },
        },
      },
    });

    if (!player || player.isDeleted) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Character not found",
      });
    }

    const equipment = player.equipment;
    if (!equipment) {
      // Create empty equipment record
      const newEquipment = await ctx.db.equipment.create({
        data: { playerId: player.id },
        include: {
          head: true,
          leftArm: true,
          rightArm: true,
          body: true,
          legs: true,
          feet: true,
          ring1: true,
          ring2: true,
          ring3: true,
          necklace: true,
          belt: true,
          cloak: true,
        },
      });
      return {
        equipment: newEquipment,
        totalStats: {
          vitality: 0,
          strength: 0,
          speed: 0,
          dexterity: 0,
          hp: 0,
          sp: 0,
          defense: 0,
        },
      };
    }

    // Calculate total stat bonuses
    const items = [
      equipment.head,
      equipment.leftArm,
      equipment.rightArm,
      equipment.body,
      equipment.legs,
      equipment.feet,
      equipment.ring1,
      equipment.ring2,
      equipment.ring3,
      equipment.necklace,
      equipment.belt,
      equipment.cloak,
    ].filter(Boolean);

    const totalStats = items.reduce(
      (acc, item) => ({
        vitality: acc.vitality + (item?.vitalityBonus ?? 0),
        strength: acc.strength + (item?.strengthBonus ?? 0),
        speed: acc.speed + (item?.speedBonus ?? 0),
        dexterity: acc.dexterity + (item?.dexterityBonus ?? 0),
        hp: acc.hp + (item?.hpBonus ?? 0),
        sp: acc.sp + (item?.spBonus ?? 0),
        defense: acc.defense + (item?.defenseBonus ?? 0),
      }),
      { vitality: 0, strength: 0, speed: 0, dexterity: 0, hp: 0, sp: 0, defense: 0 }
    );

    return {
      equipment,
      totalStats,
    };
  }),

  // Get inventory items that can be equipped, filtered by slot if provided
  getEquippableInventory: protectedProcedure
    .input(
      z.object({
        slot: equipmentSlotSchema.optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      }

      const inventoryItems = await ctx.db.inventoryItem.findMany({
        where: { playerId: player.id },
        include: {
          item: true,
        },
        orderBy: [
          { item: { name: "asc" } },
          { createdAt: "asc" },
        ],
      });

      // Filter to equippable item types (WEAPON, ARMOR, ACCESSORY, EQUIPMENT)
      // Items must have an equipmentSlot (either set or inferred) to be equippable
      let equippable = inventoryItems.filter((invItem) => {
        const itemType = invItem.item.itemType;
        const isEquippableType = 
          itemType === "WEAPON" || 
          itemType === "ARMOR" || 
          itemType === "ACCESSORY" || 
          itemType === "EQUIPMENT";
        
        if (!isEquippableType) return false;
        
        // Check if item has an effective equipmentSlot (either set or inferred)
        const effectiveSlot = getEffectiveEquipmentSlot(invItem.item);
        return effectiveSlot !== null;
      });

      // If slot is specified, filter to items that match that slot
      if (input?.slot) {
        if (input.slot === "RING1" || input.slot === "RING2" || input.slot === "RING3") {
          // Ring slots accept items with equipmentSlot: "RING"
          equippable = equippable.filter((invItem) => {
            const effectiveSlot = getEffectiveEquipmentSlot(invItem.item);
            return effectiveSlot === "RING";
          });
        } else if (input.slot === "LEFT_ARM" || input.slot === "RIGHT_ARM") {
          // Both arm slots accept items with equipmentSlot: "ARMS"
          equippable = equippable.filter((invItem) => {
            const effectiveSlot = getEffectiveEquipmentSlot(invItem.item);
            return effectiveSlot === "ARMS";
          });
        } else {
          equippable = equippable.filter((invItem) => {
            const effectiveSlot = getEffectiveEquipmentSlot(invItem.item);
            return effectiveSlot === input.slot;
          });
        }
      }

      // Group by item for display
      const grouped = equippable.reduce((acc, invItem) => {
        const key = invItem.itemId;
        if (!acc[key]) {
          acc[key] = {
            item: invItem.item,
            inventoryItems: [],
            totalQuantity: 0,
          };
        }
        acc[key].inventoryItems.push(invItem);
        acc[key].totalQuantity += invItem.quantity;
        return acc;
      }, {} as Record<string, { item: typeof equippable[0]["item"]; inventoryItems: typeof equippable; totalQuantity: number }>);

      return Object.values(grouped);
    }),

  // Equip an item to a slot (with swap support)
  equipItem: protectedProcedure
    .input(
      z.object({
        inventoryItemId: z.string(),
        toSlot: equipmentSlotSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      }

      // Get inventory item
      const inventoryItem = await ctx.db.inventoryItem.findUnique({
        where: { id: input.inventoryItemId },
        include: { item: true },
      });

      if (!inventoryItem || inventoryItem.playerId !== player.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inventory item not found",
        });
      }

      // Validate item type (must be equippable)
      const isEquippableType = 
        inventoryItem.item.itemType === "WEAPON" ||
        inventoryItem.item.itemType === "ARMOR" ||
        inventoryItem.item.itemType === "ACCESSORY" ||
        inventoryItem.item.itemType === "EQUIPMENT";
      
      if (!isEquippableType) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Item is not equippable",
        });
      }

      // Get effective equipment slot (inferred if missing)
      const effectiveSlot = getEffectiveEquipmentSlot(inventoryItem.item);
      
      if (!effectiveSlot) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Item does not have an equipment slot",
        });
      }

      // Validate slot match
      if (input.toSlot === "RING1" || input.toSlot === "RING2" || input.toSlot === "RING3") {
        // Ring slots accept items with equipmentSlot: "RING"
        if (effectiveSlot !== "RING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Item slot does not match",
          });
        }
      } else if (input.toSlot === "LEFT_ARM" || input.toSlot === "RIGHT_ARM") {
        // Both arm slots accept items with equipmentSlot: "ARMS"
        if (effectiveSlot !== "ARMS") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Item slot does not match",
          });
        }
      } else {
        if (effectiveSlot !== input.toSlot) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Item slot does not match",
          });
        }
      }

      // Ensure equipment record exists
      let equipment = await ctx.db.equipment.findUnique({
        where: { playerId: player.id },
      });

      if (!equipment) {
        equipment = await ctx.db.equipment.create({
          data: { playerId: player.id },
        });
      }

      // Determine which field to update
      const dbField = slotToFieldMap[input.toSlot];

      // Use transaction to handle swap
      await ctx.db.$transaction(async (tx) => {
        const currentEquipment = await tx.equipment.findUnique({
          where: { playerId: player.id },
        });

        if (!currentEquipment) {
          throw new Error("Equipment not found");
        }

        const currentItemId = currentEquipment[dbField as keyof typeof currentEquipment] as string | null;

        // Remove 1 quantity from inventory
        await removeItemFromInventory(player.id, inventoryItem.itemId, 1, tx);

        // If slot is occupied, add old item back to inventory
        if (currentItemId) {
          await addItemToInventory(player.id, currentItemId, 1, tx);
        }

        // Equip new item
        await tx.equipment.update({
          where: { playerId: player.id },
          data: {
            [dbField]: inventoryItem.itemId,
          },
        });
      });

      return { success: true };
    }),

  // Unequip an item from a slot
  unequip: protectedProcedure
    .input(
      z.object({
        fromSlot: equipmentSlotSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      }

      const equipment = await ctx.db.equipment.findUnique({
        where: { playerId: player.id },
      });

      if (!equipment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No equipment found",
        });
      }

      // Determine which field to clear
      const dbField = slotToFieldMap[input.fromSlot];

      const itemId = equipment[dbField as keyof typeof equipment] as string | null;

      if (!itemId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Slot is already empty",
        });
      }

      // Use transaction
      await ctx.db.$transaction(async (tx) => {
        // Add item back to inventory
        await addItemToInventory(player.id, itemId, 1, tx);

        // Clear equipment slot
        await tx.equipment.update({
          where: { playerId: player.id },
          data: {
            [dbField]: null,
          },
        });
      });

      return { success: true };
    }),
});
