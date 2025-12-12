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
 * 
 * Enforces quantity >= 0 safety.
 */
export async function addItemToInventory(
  playerId: string,
  itemId: string,
  quantity: number,
  tx?: DbClient
): Promise<void> {
  if (quantity <= 0) {
    throw new Error(`Cannot add non-positive quantity: ${quantity}`);
  }
  
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
        if (newQuantity < 0) {
          throw new Error(`Inventory quantity would become negative: ${newQuantity}`);
        }
        
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
 * 
 * Enforces quantity >= 0 safety and ensures inventory quantities never go negative.
 */
export async function removeItemFromInventory(
  playerId: string,
  itemId: string,
  quantity: number,
  tx?: DbClient
): Promise<boolean> {
  if (quantity <= 0) {
    throw new Error(`Cannot remove non-positive quantity: ${quantity}`);
  }
  
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
      const newQuantity = inventoryItem.quantity - remainingToRemove;
      if (newQuantity < 0) {
        throw new Error(`Inventory quantity would become negative: ${newQuantity}`);
      }
      
      await client.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          quantity: newQuantity,
        },
      });
      remainingToRemove = 0;
    }
  }

  if (remainingToRemove > 0) {
    // Insufficient items, but we should have caught this earlier
    return false;
  }

  return true;
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
