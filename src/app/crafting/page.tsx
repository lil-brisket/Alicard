"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

export default function CraftingPage() {
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();

  const { data: jobs } = api.jobs.listJobs.useQuery();
  const { data: recipes, isLoading: recipesLoading } = api.recipes.listRecipes.useQuery(
    selectedJobId ? { jobId: selectedJobId } : {}
  );
  
  const utils = api.useUtils();
  const craftRecipeMutation = api.recipes.craftRecipe.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(
          `Crafted successfully! +${data.xpGained} XP${data.leveledUp ? " (Level Up!)" : ""}`
        );
        if (data.outputItem && data.outputQty > 0) {
          toast.success(`Created: ${data.outputQty}x ${data.outputItem.name}`);
        }
      } else {
        toast.error("Crafting failed");
      }
      void utils.recipes.listRecipes.invalidate();
      void utils.jobs.getJobProgression.invalidate();
      void utils.player.getInventory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to craft");
    },
  });

  // Group recipes by job
  const recipesByJob = recipes?.reduce((acc, recipe) => {
    const jobId = recipe.jobId;
    if (!jobId || !recipe.job) return acc;
    
    if (!acc[jobId]) {
      acc[jobId] = {
        job: recipe.job,
        recipes: [],
      };
    }
    acc[jobId]!.recipes.push(recipe);
    return acc;
  }, {} as Record<string, { job: NonNullable<typeof recipes[number]["job"]>; recipes: Array<typeof recipes[number]> }>);

  const craftingJobs = jobs?.filter((job) => job.category === "CRAFT") ?? [];

  if (recipesLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <h1 className="text-2xl font-bold text-cyan-400">Crafting</h1>
          <p className="mt-2 text-slate-400">Loading recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <h1 className="text-2xl font-bold text-cyan-400">Crafting</h1>
        <p className="mt-2 text-slate-400">
          Create items using recipes organized by profession
        </p>

        {/* Job Filter */}
        {craftingJobs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedJobId(undefined)}
              className={`rounded px-3 py-1 text-sm transition ${
                selectedJobId === undefined
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All Professions
            </button>
            {craftingJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className={`rounded px-3 py-1 text-sm transition ${
                  selectedJobId === job.id
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {job.name}
              </button>
            ))}
          </div>
        )}

        {/* Recipes by Profession */}
        <div className="mt-6 space-y-6">
          {selectedJobId ? (
            // Show recipes for selected job
            recipes && recipes.length > 0 ? (
              <div>
                <h2 className="mb-4 text-lg font-semibold text-slate-100">
                  {recipes[0]?.job.name} Recipes
                </h2>
                <div className="space-y-3">
                  {recipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-100">{recipe.name}</h3>
                          {recipe.description && (
                            <p className="mt-1 text-sm text-slate-400">{recipe.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded bg-yellow-500/20 px-2 py-1 text-yellow-400">
                              Difficulty: {"★".repeat(recipe.difficulty)}
                            </span>
                            <span className="rounded bg-green-500/20 px-2 py-1 text-green-400">
                              Output: {recipe.outputQty}x {recipe.outputItem.name}
                            </span>
                          </div>
                          {recipe.inputs.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs text-slate-400">Requires: </span>
                              {recipe.inputs.map((input, idx) => (
                                <span key={input.id} className="text-xs text-red-400">
                                  {idx > 0 && ", "}
                                  {input.qty}x {input.item.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => craftRecipeMutation.mutate({ recipeId: recipe.id })}
                          disabled={craftRecipeMutation.isPending}
                          className="ml-4 rounded bg-cyan-500/20 px-4 py-2 text-sm text-cyan-400 transition hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {craftRecipeMutation.isPending ? "Crafting..." : "Craft"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
                <p className="text-slate-400">No recipes found for this profession</p>
              </div>
            )
          ) : (
            // Show all recipes grouped by profession
            recipesByJob && Object.keys(recipesByJob).length > 0 ? (
              Object.values(recipesByJob).map(({ job, recipes: jobRecipes }) => (
                <div key={job.id}>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-cyan-400">{job.name}</h2>
                    <Link
                      href={`/hub/jobs/${job.key}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300 transition"
                    >
                      View Job →
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {jobRecipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-100">{recipe.name}</h3>
                            {recipe.description && (
                              <p className="mt-1 text-sm text-slate-400">{recipe.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <span className="rounded bg-yellow-500/20 px-2 py-1 text-yellow-400">
                                Difficulty: {"★".repeat(recipe.difficulty)}
                              </span>
                              <span className="rounded bg-green-500/20 px-2 py-1 text-green-400">
                                Output: {recipe.outputQty}x {recipe.outputItem.name}
                              </span>
                            </div>
                            {recipe.inputs.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-slate-400">Requires: </span>
                                {recipe.inputs.map((input, idx) => (
                                  <span key={input.id} className="text-xs text-red-400">
                                    {idx > 0 && ", "}
                                    {input.qty}x {input.item.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => craftRecipeMutation.mutate({ recipeId: recipe.id })}
                            disabled={craftRecipeMutation.isPending}
                            className="ml-4 rounded bg-cyan-500/20 px-4 py-2 text-sm text-cyan-400 transition hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {craftRecipeMutation.isPending ? "Crafting..." : "Craft"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
                <p className="text-slate-400">No recipes available</p>
              </div>
            )
          )}
        </div>

        <div className="mt-8">
          <Link
            href="/hub"
            className="inline-block rounded-xl bg-cyan-500/20 px-6 py-3 text-cyan-400 transition hover:bg-cyan-500/30"
          >
            Return to Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
