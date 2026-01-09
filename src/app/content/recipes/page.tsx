"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function ContentRecipesPage() {
  const [jobId, setJobId] = useState<string | undefined>();
  const [station, setStation] = useState<string | undefined>();
  const [isActive, setIsActive] = useState<boolean | undefined>(true);
  const [search, setSearch] = useState("");
  const [levelMin, setLevelMin] = useState<number | undefined>();
  const [levelMax, setLevelMax] = useState<number | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const { data: jobs } = api.jobs.listJobs.useQuery();
  const { data: recipes, isLoading } = api.content.recipes.list.useQuery({
    jobId,
    station: station as "SMELTER" | "ANVIL" | "FORGE" | "TEMPERING_RACK" | undefined,
    isActive,
    query: search || undefined,
    levelMin,
    levelMax,
    limit: 100,
  });

  const utils = api.useUtils();

  const bulkUpdate = api.content.recipes.bulkUpdate.useMutation({
    onSuccess: () => {
      toast.success("Bulk update completed");
      setSelectedIds(new Set());
      setShowBulkActions(false);
      void utils.content.recipes.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Bulk update failed");
    },
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === recipes?.length) {
      setSelectedIds(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedIds(new Set(recipes?.map((r) => r.id) ?? []));
      setShowBulkActions(true);
    }
  };

  const handleBulkActivate = () => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate({
      recipeIds: Array.from(selectedIds),
      patch: { isActive: true },
    });
  };

  const handleBulkDeactivate = () => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate({
      recipeIds: Array.from(selectedIds),
      patch: { isActive: false },
    });
  };

  const handleBulkLevelOffset = (offset: number) => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate({
      recipeIds: Array.from(selectedIds),
      patch: { levelOffset: offset },
    });
  };

  const handleBulkXPAdjust = (percent: number) => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate({
      recipeIds: Array.from(selectedIds),
      patch: { xpAdjustPercent: percent },
    });
  };

  const handleBulkTimeAdjust = (percent: number) => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate({
      recipeIds: Array.from(selectedIds),
      patch: { timeAdjustPercent: percent },
    });
  };

  const handleExport = () => {
    if (selectedIds.size === 0) {
      toast.error("Please select recipes to export");
      return;
    }

    // This would call the export endpoint and download JSON
    // For now, just show a message
    toast.success(`Exporting ${selectedIds.size} recipes...`);
    // TODO: Implement actual export download
  };

  const stations = ["SMELTER", "ANVIL", "FORGE", "TEMPERING_RACK"] as const;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">Recipes</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage crafting recipes
          </p>
        </div>
        <Link
          href="/content/recipes/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          Create Recipe
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Job
            </label>
            <select
              value={jobId || ""}
              onChange={(e) => setJobId(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All Jobs</option>
              {jobs?.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Station
            </label>
            <select
              value={station || ""}
              onChange={(e) => setStation(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All Stations</option>
              {stations.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Status
            </label>
            <select
              value={isActive === undefined ? "" : isActive ? "active" : "inactive"}
              onChange={(e) => {
                const val = e.target.value;
                setIsActive(val === "" ? undefined : val === "active");
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Level Min
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={levelMin || ""}
              onChange={(e) =>
                setLevelMin(e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder="Min"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Level Max
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={levelMax || ""}
              onChange={(e) =>
                setLevelMax(e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder="Max"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 p-4">
          <span className="text-sm font-medium text-cyan-400">
            {selectedIds.size} selected
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleBulkActivate}
              disabled={bulkUpdate.isPending}
              className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              Activate
            </button>
            <button
              onClick={handleBulkDeactivate}
              disabled={bulkUpdate.isPending}
              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              Deactivate
            </button>
            <button
              onClick={() => handleBulkLevelOffset(1)}
              disabled={bulkUpdate.isPending}
              className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-600 disabled:opacity-50"
            >
              Level +1
            </button>
            <button
              onClick={() => handleBulkLevelOffset(-1)}
              disabled={bulkUpdate.isPending}
              className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-600 disabled:opacity-50"
            >
              Level -1
            </button>
            <button
              onClick={() => handleBulkXPAdjust(10)}
              disabled={bulkUpdate.isPending}
              className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-600 disabled:opacity-50"
            >
              XP +10%
            </button>
            <button
              onClick={() => handleBulkXPAdjust(-10)}
              disabled={bulkUpdate.isPending}
              className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-600 disabled:opacity-50"
            >
              XP -10%
            </button>
            <button
              onClick={() => handleBulkTimeAdjust(10)}
              disabled={bulkUpdate.isPending}
              className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-600 disabled:opacity-50"
            >
              Time +10%
            </button>
            <button
              onClick={() => handleBulkTimeAdjust(-10)}
              disabled={bulkUpdate.isPending}
              className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-600 disabled:opacity-50"
            >
              Time -10%
            </button>
            <button
              onClick={handleExport}
              disabled={bulkUpdate.isPending}
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              Export JSON
            </button>
            <button
              onClick={() => {
                setSelectedIds(new Set());
                setShowBulkActions(false);
              }}
              className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">Loading recipes...</p>
        </div>
      ) : recipes && recipes.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === recipes.length && recipes.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-700"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Job
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Station
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Output
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Inputs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  XP
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Active
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Updated
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recipes.map((recipe) => (
                <tr
                  key={recipe.id}
                  className={`hover:bg-slate-800/30 ${
                    selectedIds.has(recipe.id) ? "bg-cyan-500/10" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(recipe.id)}
                      onChange={() => toggleSelect(recipe.id)}
                      className="rounded border-slate-700"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{recipe.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {recipe.job.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {recipe.requiredJobLevel}
                  </td>
                  <td className="px-4 py-3">
                    {recipe.station ? (
                      <span className="inline-flex rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-400">
                        {recipe.station}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {recipe.outputQty}x {recipe.outputItem.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {recipe.inputs.length} item{recipe.inputs.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {recipe.xp ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {recipe.craftTimeSeconds ?? 0}s
                  </td>
                  <td className="px-4 py-3">
                    {recipe.isActive ? (
                      <span className="inline-flex rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {recipe.updatedAt
                      ? new Date(recipe.updatedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/content/recipes/${recipe.id}`}
                        className="text-sm text-cyan-400 hover:text-cyan-300"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No recipes found</p>
          <Link
            href="/content/recipes/new"
            className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
          >
            Create your first recipe
          </Link>
        </div>
      )}
    </div>
  );
}
