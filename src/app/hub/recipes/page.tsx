"use client";

import React from "react";
import { api } from "~/trpc/react";
import { RecipeCard } from "./_components/recipe-card";

export default function RecipesPage() {
  const { data: recipes, isLoading } = api.recipes.listRecipes.useQuery();
  const { data: jobs } = api.jobs.listJobs.useQuery();
  const [selectedJobId, setSelectedJobId] = React.useState<string | undefined>();

  const { data: filteredRecipes } = api.recipes.listRecipes.useQuery(
    { jobId: selectedJobId },
    { enabled: !!selectedJobId || selectedJobId === undefined }
  );

  const displayRecipes = selectedJobId ? filteredRecipes : recipes;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <h1 className="text-2xl font-bold text-cyan-400">Recipes</h1>
          <p className="mt-2 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <h1 className="text-2xl font-bold text-cyan-400">Recipes</h1>
        <p className="mt-2 text-slate-400">
          Browse available crafting recipes
        </p>

        {jobs && jobs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedJobId(undefined)}
              className={`rounded px-3 py-1 text-sm transition ${
                selectedJobId === undefined
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All
            </button>
            {jobs.map((job) => (
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

        <div className="mt-6 space-y-4">
          {displayRecipes && displayRecipes.length > 0 ? (
            displayRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))
          ) : (
            <p className="text-slate-400">No recipes found</p>
          )}
        </div>
      </div>
    </div>
  );
}
