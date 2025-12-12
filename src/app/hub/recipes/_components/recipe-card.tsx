"use client";

import Link from "next/link";

type RecipeCardProps = {
  recipe: {
    id: string;
    name: string;
    description: string | null;
    difficulty: number;
    outputQty: number;
    job: {
      name: string;
    };
    outputItem: {
      name: string;
      itemRarity: string;
    };
    inputs: Array<{
      qty: number;
      item: {
        name: string;
      };
    }>;
  };
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const difficultyStars = "★".repeat(recipe.difficulty);
  const rarityColors: Record<string, string> = {
    COMMON: "text-slate-400",
    UNCOMMON: "text-green-400",
    RARE: "text-blue-400",
    EPIC: "text-purple-400",
    LEGENDARY: "text-yellow-400",
  };

  return (
    <Link
      href={`/hub/recipes/${recipe.id}`}
      className="group block rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/70 hover:bg-slate-900/80"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-300">
              {recipe.name}
            </h3>
            <span
              className={`text-xs ${rarityColors[recipe.outputItem.itemRarity] ?? "text-slate-400"}`}
            >
              {recipe.outputItem.itemRarity}
            </span>
          </div>
          {recipe.description && (
            <p className="mt-1 text-sm text-slate-400">{recipe.description}</p>
          )}
          <div className="mt-3 space-y-2">
            <div className="text-xs text-slate-400">
              <span className="font-medium">Job:</span> {recipe.job.name} |{" "}
              <span className="font-medium">Difficulty:</span>{" "}
              <span className="text-yellow-400">{difficultyStars}</span>
            </div>
            <div className="text-xs text-slate-400">
              <span className="font-medium">Output:</span>{" "}
              <span className="text-emerald-400">
                {recipe.outputQty}x {recipe.outputItem.name}
              </span>
            </div>
            {recipe.inputs.length > 0 && (
              <div className="text-xs text-slate-400">
                <span className="font-medium">Inputs:</span>{" "}
                {recipe.inputs
                  .map((input) => `${input.qty}x ${input.item.name}`)
                  .join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
