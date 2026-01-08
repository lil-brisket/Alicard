"use client";

import { use, useState, useMemo } from "react";
import { api } from "~/trpc/react";
import { ProgressBar } from "../../hub/jobs/_components/progress-bar";
import Link from "next/link";
import { usePlayerStations } from "~/hooks/use-player-stations";

type Props = {
  params: Promise<{ jobKey: string }>;
};

type StationTab = "ALL" | "SMELTER" | "ANVIL";
type AnvilCategoryTab = "ALL" | "WEAPONS" | "HELMETS" | "CHEST" | "LEGS" | "TOOLS" | "OTHER";

export default function JobDetailPage({ params }: Props) {
  const { jobKey } = use(params);
  const [selectedStationTab, setSelectedStationTab] = useState<StationTab>("ALL");
  const [selectedAnvilCategory, setSelectedAnvilCategory] = useState<AnvilCategoryTab>("ALL");
  
  const { data: jobs } = api.jobs.listJobs.useQuery();
  const job = jobs?.find((j) => j.key === jobKey);
  
  const { data: progression } = api.jobs.getJobProgression.useQuery(
    { jobId: job?.id ?? "" },
    { enabled: !!job?.id }
  );
  
  const { data: recipes } = api.recipes.listRecipes.useQuery(
    { 
      jobId: job?.id,
      playerLevel: progression?.level,
    },
    { enabled: !!job?.id && !!progression }
  );
  
  const { data: nodes } = api.gathering.listNodes.useQuery(
    { 
      jobId: job?.id,
      playerLevel: progression?.level,
    },
    { enabled: !!job?.id && !!progression }
  );

  const utils = api.useUtils();
  const setActiveJobMutation = api.jobs.setActiveJob.useMutation({
    onSuccess: () => {
      void utils.jobs.getJobProgression.invalidate({ jobId: job?.id ?? "" });
    },
  });

  const availableStations = usePlayerStations();

  // Filter recipes based on selected tabs
  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    
    let filtered = recipes;

    // Filter by station
    if (selectedStationTab === "SMELTER") {
      filtered = filtered.filter(r => r.station === "SMELTER");
    } else if (selectedStationTab === "ANVIL") {
      filtered = filtered.filter(r => r.station === "ANVIL");
      
      // Further filter by Anvil category
      if (selectedAnvilCategory === "WEAPONS") {
        filtered = filtered.filter(r => r.outputItem.itemType === "WEAPON");
      } else if (selectedAnvilCategory === "HELMETS") {
        filtered = filtered.filter(r => 
          r.outputItem.itemType === "ARMOR" && 
          (r.outputItem as { equipmentSlot?: string }).equipmentSlot === "HEAD"
        );
      } else if (selectedAnvilCategory === "CHEST") {
        filtered = filtered.filter(r => 
          r.outputItem.itemType === "ARMOR" && 
          (r.outputItem as { equipmentSlot?: string }).equipmentSlot === "BODY"
        );
      } else if (selectedAnvilCategory === "LEGS") {
        filtered = filtered.filter(r => 
          r.outputItem.itemType === "ARMOR" && 
          (r.outputItem as { equipmentSlot?: string }).equipmentSlot === "LEGS"
        );
      } else if (selectedAnvilCategory === "TOOLS") {
        filtered = filtered.filter(r => r.outputItem.itemType === "TOOL");
      } else if (selectedAnvilCategory === "OTHER") {
        filtered = filtered.filter(r => {
          const itemType = r.outputItem.itemType;
          const slot = (r.outputItem as { equipmentSlot?: string }).equipmentSlot;
          return !(
            itemType === "WEAPON" ||
            itemType === "TOOL" ||
            (itemType === "ARMOR" && (slot === "HEAD" || slot === "BODY" || slot === "LEGS"))
          );
        });
      }
    }

    return filtered;
  }, [recipes, selectedStationTab, selectedAnvilCategory]);

  // Check if this is a blacksmith job
  const isBlacksmith = job?.key === "blacksmith";

  if (!job) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>←</span>
            <span>Back to Jobs</span>
          </Link>
        </div>
        <div className="mt-4 rounded bg-red-500/20 border border-red-500/50 p-4">
          <p className="text-red-400 font-semibold">Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <div>
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>←</span>
            <span>Back to Jobs</span>
          </Link>
        </div>
        
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">{job.name}</h1>
            <p className="mt-2 text-slate-400">{job.description}</p>
            <div className="mt-2">
              <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                {job.category}
              </span>
            </div>
          </div>
          {progression && !progression.active && (
            <button
              onClick={() => {
                setActiveJobMutation.mutate({ jobId: job.id });
              }}
              disabled={setActiveJobMutation.isPending}
              className="rounded bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {setActiveJobMutation.isPending ? "Activating..." : "Set Active"}
            </button>
          )}
          {progression?.active && (
            <span className="rounded bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400">
              Active
            </span>
          )}
        </div>

        {progression && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              Progression
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Level</span>
                <span className="font-semibold text-cyan-400">
                  {progression.level} {progression.isMaxLevel ? "(Max)" : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total XP</span>
                <span className="font-semibold text-slate-100">
                  {progression.totalXp}
                </span>
              </div>
              {!progression.isMaxLevel && (
                <ProgressBar
                  current={progression.xpInLevel}
                  max={progression.xpToNext}
                  label="XP to Next Level"
                />
              )}
            </div>
          </div>
        )}

        {recipes && recipes.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              Recipes
            </h2>

            {/* Station Tabs (for blacksmith jobs) */}
            {isBlacksmith && (
              <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
                <button
                  onClick={() => {
                    setSelectedStationTab("ALL");
                    setSelectedAnvilCategory("ALL");
                  }}
                  className={`rounded px-4 py-2 text-sm font-medium transition ${
                    selectedStationTab === "ALL"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-transparent"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setSelectedStationTab("SMELTER");
                    setSelectedAnvilCategory("ALL");
                  }}
                  className={`rounded px-4 py-2 text-sm font-medium transition ${
                    selectedStationTab === "SMELTER"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-transparent"
                  }`}
                >
                  Smelter
                </button>
                <button
                  onClick={() => {
                    setSelectedStationTab("ANVIL");
                    setSelectedAnvilCategory("ALL");
                  }}
                  className={`rounded px-4 py-2 text-sm font-medium transition ${
                    selectedStationTab === "ANVIL"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-transparent"
                  }`}
                >
                  Anvil
                </button>
              </div>
            )}

            {/* Anvil Category Tabs (only shown when Anvil is selected for blacksmith) */}
            {isBlacksmith && selectedStationTab === "ANVIL" && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedAnvilCategory("ALL")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    selectedAnvilCategory === "ALL"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent"
                  }`}
                >
                  All Anvil
                </button>
                <button
                  onClick={() => setSelectedAnvilCategory("WEAPONS")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    selectedAnvilCategory === "WEAPONS"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent"
                  }`}
                >
                  Weapons
                </button>
                <button
                  onClick={() => setSelectedAnvilCategory("HELMETS")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    selectedAnvilCategory === "HELMETS"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent"
                  }`}
                >
                  Helmets
                </button>
                <button
                  onClick={() => setSelectedAnvilCategory("CHEST")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    selectedAnvilCategory === "CHEST"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent"
                  }`}
                >
                  Chest Armor
                </button>
                <button
                  onClick={() => setSelectedAnvilCategory("LEGS")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    selectedAnvilCategory === "LEGS"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent"
                  }`}
                >
                  Leg Armor
                </button>
                <button
                  onClick={() => setSelectedAnvilCategory("TOOLS")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    selectedAnvilCategory === "TOOLS"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent"
                  }`}
                >
                  Tools
                </button>
                <button
                  onClick={() => setSelectedAnvilCategory("OTHER")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    selectedAnvilCategory === "OTHER"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent"
                  }`}
                >
                  Other
                </button>
              </div>
            )}

            <div className="space-y-3">
              {filteredRecipes.length > 0 ? (
                filteredRecipes.map((recipe) => {
                  const station = recipe.station as "SMELTER" | "ANVIL" | "FORGE" | "TEMPERING_RACK" | null;
                  const hasStation = station ? availableStations.has(station) : true;
                  const craftTimeSeconds = recipe.craftTimeSeconds ?? 0;
                  const minutes = Math.floor(craftTimeSeconds / 60);
                  const seconds = craftTimeSeconds % 60;
                  const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                  const xp = recipe.xp ?? 0;

                  return (
                    <div
                      key={recipe.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-100">
                              {recipe.name}
                            </h3>
                            {station && (
                              <span className="inline-flex rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                                {station}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400">
                            Difficulty: {"★".repeat(recipe.difficulty)} | Output:{" "}
                            {recipe.outputQty}x {recipe.outputItem.name}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                            {xp > 0 && <span>XP: {xp}</span>}
                            {craftTimeSeconds > 0 && <span>Time: {timeDisplay}</span>}
                            <span>Level: {recipe.requiredJobLevel}</span>
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col gap-2">
                          <Link
                            href={`/hub/recipes/${recipe.id}`}
                            className="rounded bg-cyan-500/20 px-3 py-1.5 text-sm text-cyan-400 transition hover:bg-cyan-500/30"
                          >
                            View
                          </Link>
                          <button
                            disabled={!hasStation}
                            className="rounded bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!hasStation ? `Requires ${station} station` : "Craft this recipe"}
                          >
                            Craft
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
                  <p className="text-slate-400">
                    {isBlacksmith && selectedStationTab !== "ALL"
                      ? `No recipes found for ${selectedStationTab === "SMELTER" ? "Smelter" : "Anvil"}${selectedStationTab === "ANVIL" && selectedAnvilCategory !== "ALL" ? ` - ${selectedAnvilCategory}` : ""}`
                      : "No recipes found"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {nodes && nodes.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              Gathering Nodes
            </h2>
            <div className="space-y-3">
              {nodes.map((node) => {
                const minutes = Math.floor((node.gatherTimeSeconds ?? 0) / 60);
                const seconds = (node.gatherTimeSeconds ?? 0) % 60;
                const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                
                return (
                  <div
                    key={node.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <h3 className="font-semibold text-slate-100">{node.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Danger: {"⚠".repeat(node.dangerTier)} | Yields:{" "}
                      {node.yields
                        .map(
                          (y) =>
                            `${y.minQty}-${y.maxQty}x ${y.item.name}`
                        )
                        .join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Req Level: {node.requiredJobLevel ?? 1} | Time: {timeDisplay} | XP: {node.xpReward ?? 10}
                      {node.tier && ` | Tier: ${node.tier}`}
                      {node.cooldownSeconds && ` | Cooldown: ${node.cooldownSeconds}s`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(!recipes || recipes.length === 0) && (!nodes || nodes.length === 0) && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
            <p className="text-slate-400">No recipes or gathering nodes available for this job.</p>
          </div>
        )}
    </div>
  );
}
