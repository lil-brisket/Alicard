import { db } from "~/server/db";

/**
 * Get all item IDs that can be gathered by a specific job
 * This checks NodeYield entries for gathering nodes associated with the job
 */
export async function getGatherableItemIdsForJob(
  jobId: string
): Promise<Set<string>> {
  const nodes = await db.gatheringNode.findMany({
    where: {
      jobId,
      isActive: true,
      status: "ACTIVE",
    },
    include: {
      yields: {
        select: {
          itemId: true,
        },
      },
    },
  });

  const itemIds = new Set<string>();
  for (const node of nodes) {
    for (const yield_ of node.yields) {
      itemIds.add(yield_.itemId);
    }
  }

  return itemIds;
}

/**
 * Get all item IDs that are outputs of recipes for a specific job
 * This allows recipes to use outputs from other recipes as inputs
 */
export async function getRecipeOutputItemIdsForJob(
  jobId: string
): Promise<Set<string>> {
  const recipes = await db.recipe.findMany({
    where: {
      jobId,
      isActive: true,
      status: "ACTIVE",
    },
    select: {
      outputItemId: true,
    },
  });

  return new Set(recipes.map((r) => r.outputItemId));
}

/**
 * Validate recipe inputs against allowed sources
 * Returns list of invalid item IDs if any
 */
export async function validateRecipeInputs(
  jobId: string,
  inputItemIds: string[],
  allowNonGatherable: boolean
): Promise<{ valid: boolean; invalidItemIds: string[] }> {
  if (allowNonGatherable) {
    return { valid: true, invalidItemIds: [] };
  }

  // Get allowed items: gatherable items + recipe outputs
  const [gatherableItems, recipeOutputs] = await Promise.all([
    getGatherableItemIdsForJob(jobId),
    getRecipeOutputItemIdsForJob(jobId),
  ]);

  const allowedItems = new Set([
    ...Array.from(gatherableItems),
    ...Array.from(recipeOutputs),
  ]);

  const invalidItemIds = inputItemIds.filter(
    (itemId) => !allowedItems.has(itemId)
  );

  return {
    valid: invalidItemIds.length === 0,
    invalidItemIds,
  };
}

