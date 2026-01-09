"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";

export default function MaterialAvailabilityReportPage() {
  const [gatherJobKey, setGatherJobKey] = useState<string>("miner");
  const [craftJobId, setCraftJobId] = useState<string | undefined>();

  const { data: jobs } = api.jobs.listJobs.useQuery();
  
  // Find gather job by key
  const gatherJob = useMemo(() => {
    return jobs?.find((j) => j.key === gatherJobKey);
  }, [jobs, gatherJobKey]);

  // Get gatherable items for the gather job
  const { data: gatherableItems } = api.content.gatheringNodes.getGatherableItems.useQuery(
    { jobId: gatherJob?.id ?? "" },
    { enabled: !!gatherJob?.id }
  );

  // Get recipes for the craft job
  const { data: recipes } = api.content.recipes.list.useQuery(
    {
      jobId: craftJobId,
      limit: 1000,
    },
    { enabled: !!craftJobId }
  );

  // Get all items used in recipes
  const { data: recipeItems } = api.content.items.list.useQuery(
    {
      limit: 10000,
    },
    { enabled: !!recipes && recipes.length > 0 }
  );

  // Analyze recipe inputs
  const analysis = useMemo(() => {
    if (!recipes || !gatherableItems || !recipeItems) {
      return null;
    }

    const recipeInputItemIds = new Set<string>();
    const recipeInputDetails: Record<string, { recipeNames: string[]; count: number }> = {};

    for (const recipe of recipes) {
      for (const input of recipe.inputs) {
        recipeInputItemIds.add(input.itemId);
        if (!recipeInputDetails[input.itemId]) {
          recipeInputDetails[input.itemId] = { recipeNames: [], count: 0 };
        }
        recipeInputDetails[input.itemId]!.recipeNames.push(recipe.name);
        recipeInputDetails[input.itemId]!.count += input.qty;
      }
    }

    const gatherableItemIds = new Set(gatherableItems.map((i) => i.id));
    const craftableOutputItemIds = new Set(
      recipes.filter((r) => r.isActive).map((r) => r.outputItemId)
    );

    // Find missing items
    const missingItems: Array<{
      itemId: string;
      itemName: string;
      usedInRecipes: string[];
    }> = [];

    const itemMap = new Map(recipeItems.map((item) => [item.id, item]));

    for (const itemId of recipeInputItemIds) {
      if (!gatherableItemIds.has(itemId) && !craftableOutputItemIds.has(itemId)) {
        const item = itemMap.get(itemId);
        missingItems.push({
          itemId,
          itemName: item?.name ?? itemId,
          usedInRecipes: recipeInputDetails[itemId]?.recipeNames ?? [],
        });
      }
    }

    return {
      recipeInputItemIds,
      recipeInputDetails,
      gatherableItemIds,
      craftableOutputItemIds,
      missingItems,
    };
  }, [recipes, gatherableItems, recipeItems]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-cyan-400">
          Material Availability Report
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Check if recipe inputs are available from gathering or crafting
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Gather Job (Source)
            </label>
            <select
              value={gatherJobKey}
              onChange={(e) => setGatherJobKey(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="miner">Miner</option>
              <option value="herbalist">Herbalist</option>
              <option value="fisher">Fisher</option>
              <option value="logger">Logger</option>
              <option value="forager">Forager</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Craft Job (Target)
            </label>
            <select
              value={craftJobId || ""}
              onChange={(e) => setCraftJobId(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Select a craft job...</option>
              {jobs
                ?.filter((j) => j.key !== gatherJobKey)
                .map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {!gatherJob ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">Loading gather job data...</p>
        </div>
      ) : !craftJobId ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">Please select a craft job to analyze</p>
        </div>
      ) : !analysis ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">Loading analysis...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Gatherable Items */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">
              Gatherable Items ({gatherableItems.length})
            </h3>
            {gatherableItems.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <ul className="space-y-1">
                  {gatherableItems.map((item) => (
                    <li key={item.id} className="text-sm text-slate-300">
                      {item.name} ({item.id})
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No gatherable items found</p>
            )}
          </div>

          {/* Recipe Inputs */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">
              Recipe Inputs ({analysis.recipeInputItemIds.size})
            </h3>
            {recipes && recipes.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <ul className="space-y-2">
                  {Array.from(analysis.recipeInputItemIds).map((itemId) => {
                    const details = analysis.recipeInputDetails[itemId];
                    const isGatherable = analysis.gatherableItemIds.has(itemId);
                    const isCraftable = analysis.craftableOutputItemIds.has(itemId);
                    const isAvailable = isGatherable || isCraftable;
                    const item = recipeItems?.find((i) => i.id === itemId);

                    return (
                      <li
                        key={itemId}
                        className={`rounded-lg border p-2 ${
                          isAvailable
                            ? "border-green-500/50 bg-green-500/10"
                            : "border-red-500/50 bg-red-500/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-300">
                            {item?.name ?? itemId}
                          </span>
                          <div className="flex gap-2">
                            {isGatherable && (
                              <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                                Gatherable
                              </span>
                            )}
                            {isCraftable && (
                              <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
                                Craftable
                              </span>
                            )}
                            {!isAvailable && (
                              <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
                                Missing
                              </span>
                            )}
                          </div>
                        </div>
                        {details && (
                          <p className="mt-1 text-xs text-slate-400">
                            Used in {details.recipeNames.length} recipe(s):{" "}
                            {details.recipeNames.slice(0, 3).join(", ")}
                            {details.recipeNames.length > 3 && "..."}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No recipes found</p>
            )}
          </div>

          {/* Missing Items Warning */}
          {analysis.missingItems.length > 0 && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6">
              <h3 className="mb-4 text-lg font-semibold text-red-400">
                ⚠️ Missing Items ({analysis.missingItems.length})
              </h3>
              <p className="mb-4 text-sm text-slate-300">
                These items are used in recipes but are not gatherable or craftable:
              </p>
              <div className="max-h-64 overflow-y-auto">
                <ul className="space-y-2">
                  {analysis.missingItems.map((item) => (
                    <li
                      key={item.itemId}
                      className="rounded-lg border border-red-500/50 bg-red-500/10 p-3"
                    >
                      <div className="font-medium text-red-400">{item.itemName}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        Used in: {item.usedInRecipes.join(", ")}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
