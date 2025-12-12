import { db } from "~/server/db";
import type { Prisma } from "../../../generated/prisma/client";

type DbClient = Omit<
  typeof db,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Add items to a player's inventory.
 * If the item is stackable and the player already has it, increment quantity.
 * Otherwise, create a new inventory entry.
 */
export async function addItemToInventory(
  playerId: string,
  itemId: string,
  quantity: number,
  tx?: DbClient
): Promise<void> {
  const client = tx ?? db;
  
  const item = await client.item.findUnique({
    where: { id: itemId },
    select: { stackable: true, maxStack: true },
  });

  if (!item) {
    throw new Error(`Item ${itemId} not found`);
  }

  if (item.stackable) {
    // Find existing stack
    const existing = await client.inventoryItem.findFirst({
      where: {
        playerId,
        itemId,
      },
    });

    if (existing) {
      // Check if adding quantity would exceed max stack
      const newQuantity = existing.quantity + quantity;
      if (newQuantity > item.maxStack) {
        // Split into multiple stacks
        const remaining = newQuantity - item.maxStack;
        await client.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: item.maxStack },
        });

        // Create new stack for remaining
        if (remaining > 0) {
          await client.inventoryItem.create({
            data: {
              playerId,
              itemId,
              quantity: remaining,
            },
          });
        }
      } else {
        // Update existing stack
        await client.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: newQuantity },
        });
      }
    } else {
      // Create new stack
      await client.inventoryItem.create({
        data: {
          playerId,
          itemId,
          quantity,
        },
      });
    }
  } else {
    // Non-stackable: create multiple entries
    for (let i = 0; i < quantity; i++) {
      await client.inventoryItem.create({
        data: {
          playerId,
          itemId,
          quantity: 1,
        },
      });
    }
  }
}

/**
 * Remove items from a player's inventory.
 * Returns true if items were successfully removed, false if insufficient quantity.
 */
export async function removeItemFromInventory(
  playerId: string,
  itemId: string,
  quantity: number,
  tx?: DbClient
): Promise<boolean> {
  const client = tx ?? db;
  
  const items = await client.inventoryItem.findMany({
    where: {
      playerId,
      itemId,
    },
    orderBy: { createdAt: "asc" },
  });

  let remainingToRemove = quantity;

  for (const inventoryItem of items) {
    if (remainingToRemove <= 0) break;

    if (inventoryItem.quantity <= remainingToRemove) {
      // Remove entire stack
      remainingToRemove -= inventoryItem.quantity;
      await client.inventoryItem.delete({
        where: { id: inventoryItem.id },
      });
    } else {
      // Reduce quantity in this stack
      await client.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          quantity: inventoryItem.quantity - remainingToRemove,
        },
      });
      remainingToRemove = 0;
    }
  }

  return remainingToRemove === 0;
}

/**
 * Check if a player has enough of an item in inventory.
 */
export async function hasItem(
  playerId: string,
  itemId: string,
  quantity: number,
  tx?: DbClient
): Promise<boolean> {
  const client = tx ?? db;
  
  const items = await client.inventoryItem.findMany({
    where: {
      playerId,
      itemId,
    },
  });

  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  return total >= quantity;
}
