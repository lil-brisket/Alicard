"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export default function MarketPage() {
  const { data: recentCrafts, isLoading } = api.recipes.getRecentCraftedItems.useQuery({
    limit: 20,
  });

  const rarityColors: Record<string, string> = {
    COMMON: "text-slate-400",
    UNCOMMON: "text-green-400",
    RARE: "text-blue-400",
    EPIC: "text-purple-400",
    LEGENDARY: "text-yellow-400",
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <h1 className="text-2xl font-bold text-cyan-400">Marketplace</h1>
        <p className="mt-2 text-slate-400">
          Buy and sell items with other players
        </p>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-100">
            Coming Soon
          </h2>
          <p className="mt-2 text-slate-400">
            The marketplace is under construction. Check back soon!
          </p>
        </div>

        {/* Recent Crafted Items Section */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-cyan-400">
            Recently Crafted Items
          </h2>
          <p className="mb-6 text-sm text-slate-400">
            See what other players have been crafting
          </p>

          {isLoading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
              <p className="text-slate-400">Loading recent crafts...</p>
            </div>
          ) : recentCrafts && recentCrafts.length > 0 ? (
            <div className="space-y-3">
              {recentCrafts.map((craft) => (
                <div
                  key={craft.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/50 hover:bg-slate-900/80"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span
                            className={`font-semibold ${
                              rarityColors[
                                craft.recipe.outputItem.itemRarity ?? "COMMON"
                              ] ?? "text-slate-400"
                            }`}
                          >
                            {craft.recipe.outputItem.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {craft.recipe.outputQty}x crafted
                          </span>
                        </div>
                        <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                          {craft.recipe.job.name}
                        </span>
                        <span
                          className={`text-xs ${
                            rarityColors[
                              craft.recipe.outputItem.itemRarity ?? "COMMON"
                            ] ?? "text-slate-400"
                          }`}
                        >
                          {craft.recipe.outputItem.itemRarity}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                        <span>
                          Crafted by{" "}
                          <span className="text-cyan-400">
                            {craft.player.characterName}
                          </span>
                        </span>
                        <span>•</span>
                        <span>{formatTimeAgo(craft.createdAt)}</span>
                        <span>•</span>
                        <span>Difficulty: {"★".repeat(craft.recipe.difficulty)}</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm text-emerald-400">
                        +{craft.xpGained} XP
                      </div>
                      <div className="text-xs text-slate-400">
                        Success
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
              <p className="text-slate-400">
                No recent crafts yet. Be the first to craft something!
              </p>
            </div>
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
