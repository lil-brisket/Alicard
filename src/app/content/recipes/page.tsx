"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function ContentRecipesPage() {
  const [jobId, setJobId] = useState<string | undefined>();
  const [station, setStation] = useState<string | undefined>();
  const [isActive, setIsActive] = useState<boolean | undefined>(true);
  const [search, setSearch] = useState("");

  const { data: jobs } = api.jobs.listJobs.useQuery();
  const { data: recipes, isLoading } = api.content.recipes.list.useQuery({
    jobId,
    station: station as "SMELTER" | "ANVIL" | "FORGE" | "TEMPERING_RACK" | undefined,
    isActive,
    query: search || undefined,
    limit: 100,
  });

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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
                  Inputs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Output
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  XP
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recipes.map((recipe) => (
                <tr key={recipe.id} className="hover:bg-slate-800/30">
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
                    {recipe.inputs.length} item{recipe.inputs.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {recipe.outputQty}x {recipe.outputItem.name}
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
                  <td className="px-4 py-3">
                    <Link
                      href={`/content/recipes/${recipe.id}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      Edit
                    </Link>
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

