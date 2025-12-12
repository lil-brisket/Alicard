"use client";

import { use } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export default function RecipeDetailPage({ params }: Props) {
  const { id } = use(params);
  
  const { data: recipe, isLoading } = api.recipes.getRecipe.useQuery({ id });
  const utils = api.useUtils();

  const craftMutation = api.recipes.craftRecipe.useMutation({
    onSuccess: () => {
      void utils.recipes.getRecipe.invalidate({ id });
      // Could also invalidate inventory queries here
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <p className="text-slate-400">Recipe not found</p>
        </div>
      </div>
    );
  }

  const difficultyStars = "★".repeat(recipe.difficulty);
  const rarityColors: Record<string, string> = {
    COMMON: "text-slate-400",
    UNCOMMON: "text-green-400",
    RARE: "text-blue-400",
    EPIC: "text-purple-400",
    LEGENDARY: "text-yellow-400",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <Link
          href="/hub/recipes"
          className="text-cyan-400 hover:text-cyan-300"
        >
          ← Back to Recipes
        </Link>
        
        <h1 className="mt-4 text-2xl font-bold text-cyan-400">{recipe.name}</h1>
        {recipe.description && (
          <p className="mt-2 text-slate-400">{recipe.description}</p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              Recipe Details
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Job:</span>{" "}
                <span className="text-cyan-400">{recipe.job.name}</span>
              </div>
              <div>
                <span className="text-slate-400">Difficulty:</span>{" "}
                <span className="text-yellow-400">{difficultyStars}</span>
              </div>
              <div>
                <span className="text-slate-400">Output:</span>{" "}
                <span
                  className={`font-semibold ${
                    rarityColors[recipe.outputItem.itemRarity] ?? "text-slate-400"
                  }`}
                >
                  {recipe.outputQty}x {recipe.outputItem.name}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              Required Materials
            </h2>
            {recipe.inputs.length > 0 ? (
              <div className="space-y-2 text-sm">
                {recipe.inputs.map((input) => (
                  <div key={input.id}>
                    <span className="text-slate-400">{input.qty}x</span>{" "}
                    <span className="text-slate-100">{input.item.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No materials required</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => {
              craftMutation.mutate({ recipeId: recipe.id });
            }}
            disabled={craftMutation.isPending}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-white transition hover:from-cyan-600 hover:to-emerald-600 disabled:opacity-50"
          >
            {craftMutation.isPending ? "Crafting..." : "Craft"}
          </button>

          {craftMutation.data && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                craftMutation.data.success
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/50 bg-red-500/10 text-red-400"
              }`}
            >
              {craftMutation.data.success ? (
                <div>
                  <p className="font-semibold">Craft Successful!</p>
                  <p className="mt-1 text-sm">
                    Received {craftMutation.data.outputQty}x{" "}
                    {recipe.outputItem.name}
                  </p>
                  <p className="mt-1 text-sm">
                    Gained {craftMutation.data.xpGained} XP
                    {craftMutation.data.leveledUp && " (Level Up!)"}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold">Craft Failed</p>
                  <p className="mt-1 text-sm">
                    Gained {craftMutation.data.xpGained} XP from the attempt
                  </p>
                </div>
              )}
            </div>
          )}

          {craftMutation.error && (
            <div className="mt-4 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-400">
              <p className="font-semibold">Error</p>
              <p className="mt-1 text-sm">{craftMutation.error.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
