"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

type AlchemyTab = "STATIONS" | "EFFECTS" | "RECIPES";

export default function ContentAlchemyPage() {
  const [activeTab, setActiveTab] = useState<AlchemyTab>("STATIONS");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cyan-400">Alchemy System</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage alchemy stations, effects, and recipes. All values are data-driven and editable.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("STATIONS")}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition ${
              activeTab === "STATIONS"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            Stations
          </button>
          <button
            onClick={() => setActiveTab("EFFECTS")}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition ${
              activeTab === "EFFECTS"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            Effects
          </button>
          <button
            onClick={() => setActiveTab("RECIPES")}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition ${
              activeTab === "RECIPES"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            Recipes
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "STATIONS" && <StationsSection />}
        {activeTab === "EFFECTS" && <EffectsSection />}
        {activeTab === "RECIPES" && <RecipesSection />}
      </div>
    </div>
  );
}

function StationsSection() {
  const [stationType, setStationType] = useState<string | undefined>("ALCHEMY");
  const [isEnabled, setIsEnabled] = useState<boolean | undefined>(true);

  const { data: stations, isLoading } = api.content.stations.list.useQuery({
    stationType,
    isEnabled,
    status: "ACTIVE",
    limit: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cyan-400">Alchemy Stations</h2>
        <Link
          href="/content/alchemy/stations/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          Create Station
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Station Type</label>
            <select
              value={stationType || ""}
              onChange={(e) => setStationType(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200"
            >
              <option value="">All Types</option>
              <option value="ALCHEMY">Alchemy</option>
              <option value="BLACKSMITH">Blacksmith</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Enabled</label>
            <select
              value={isEnabled === undefined ? "" : isEnabled ? "true" : "false"}
              onChange={(e) =>
                setIsEnabled(e.target.value === "" ? undefined : e.target.value === "true")
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200"
            >
              <option value="">All</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stations Table */}
      {isLoading ? (
        <div className="text-center text-slate-400">Loading stations...</div>
      ) : stations && stations.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Key</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Unlock Level</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Enabled</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Recipes</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stations.map((station) => (
                <tr key={station.id} className="hover:bg-slate-900/30">
                  <td className="px-4 py-3 text-sm text-slate-200">{station.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{station.key}</td>
                  <td className="px-4 py-3 text-sm text-slate-200">{station.unlockLevel}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        station.isEnabled
                          ? "bg-green-900/30 text-green-400"
                          : "bg-red-900/30 text-red-400"
                      }`}
                    >
                      {station.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {station._count.recipes || 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/content/alchemy/stations/${station.id}`}
                      className="text-cyan-400 hover:text-cyan-300"
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
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
          No stations found. Create one to get started.
        </div>
      )}
    </div>
  );
}

function EffectsSection() {
  const [effectType, setEffectType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>("ACTIVE");

  const { data: effects, isLoading } = api.content.effects.list.useQuery({
    type: effectType,
    status: status as "DRAFT" | "ACTIVE" | "DISABLED" | "PUBLISHED" | "ARCHIVED" | undefined,
    limit: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cyan-400">Effect Definitions</h2>
        <Link
          href="/content/alchemy/effects/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          Create Effect
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Effect Type</label>
            <select
              value={effectType || ""}
              onChange={(e) => setEffectType(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200"
            >
              <option value="">All Types</option>
              <option value="HEAL_INSTANT">Heal Instant</option>
              <option value="HEAL_REGEN">Heal Regen</option>
              <option value="STAMINA_RESTORE">Stamina Restore</option>
              <option value="BUFF_STAT">Buff Stat</option>
              <option value="RESISTANCE">Resistance</option>
              <option value="DAMAGE_OVER_TIME">Damage Over Time</option>
              <option value="UTILITY">Utility</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Status</label>
            <select
              value={status || ""}
              onChange={(e) => setStatus(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Effects Table */}
      {isLoading ? (
        <div className="text-center text-slate-400">Loading effects...</div>
      ) : effects && effects.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Magnitude</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Duration</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Items</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {effects.map((effect) => (
                <tr key={effect.id} className="hover:bg-slate-900/30">
                  <td className="px-4 py-3 text-sm text-slate-200">{effect.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{effect.type}</td>
                  <td className="px-4 py-3 text-sm text-slate-200">{effect.magnitude}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {effect.durationSeconds ? `${effect.durationSeconds}s` : "Instant"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {effect._count.itemEffects || 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/content/alchemy/effects/${effect.id}`}
                      className="text-cyan-400 hover:text-cyan-300"
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
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
          No effects found. Create one to get started.
        </div>
      )}
    </div>
  );
}

function RecipesSection() {
  const [category, setCategory] = useState<string | undefined>();
  const [stationDefId, setStationDefId] = useState<string | undefined>();

  // Get alchemy job ID
  const { data: jobs } = api.jobs.listJobs.useQuery();
  const alchemistJob = jobs?.find((j) => j.key === "alchemist");

  // Get alchemy stations for filter
  const { data: stations } = api.content.stations.list.useQuery({
    stationType: "ALCHEMY",
    isEnabled: true,
    status: "ACTIVE",
    limit: 20,
  });

  const { data: recipes, isLoading } = api.content.recipes.list.useQuery({
    jobId: alchemistJob?.id,
    category,
    stationDefinitionId: stationDefId,
    status: "ACTIVE",
    limit: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cyan-400">Alchemy Recipes</h2>
        <Link
          href="/content/alchemy/recipes/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          Create Recipe
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Category</label>
            <select
              value={category || ""}
              onChange={(e) => setCategory(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200"
            >
              <option value="">All Categories</option>
              <option value="POTION">Potion</option>
              <option value="BREW">Brew</option>
              <option value="OIL">Oil</option>
              <option value="POWDER">Powder</option>
              <option value="SALVE">Salve</option>
              <option value="ELIXIR">Elixir</option>
              <option value="BOMB">Bomb</option>
              <option value="UTILITY">Utility</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Station</label>
            <select
              value={stationDefId || ""}
              onChange={(e) => setStationDefId(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200"
            >
              <option value="">All Stations</option>
              {stations?.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} (L{station.unlockLevel})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Recipes Table */}
      {isLoading ? (
        <div className="text-center text-slate-400">Loading recipes...</div>
      ) : recipes && recipes.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Level</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Station</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">XP</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recipes.map((recipe) => (
                <tr key={recipe.id} className="hover:bg-slate-900/30">
                  <td className="px-4 py-3 text-sm text-slate-200">{recipe.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{recipe.category || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-200">{recipe.requiredJobLevel}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {recipe.stationDefinition?.name || recipe.station || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-200">{recipe.xp}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/content/recipes/${recipe.id}`}
                      className="text-cyan-400 hover:text-cyan-300"
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
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
          No recipes found. Create one to get started.
        </div>
      )}
    </div>
  );
}
