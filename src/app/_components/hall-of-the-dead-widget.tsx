"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export function HallOfTheDeadWidget() {
  const { data: topDead, isLoading } = api.hallOfTheDead.getTop10.useQuery();

  if (isLoading) {
    return (
      <section className="w-full max-w-2xl mx-auto px-4 py-8">
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-red-400">
            Hall of the Dead
          </h2>
          <p className="text-slate-400">Loading...</p>
        </div>
      </section>
    );
  }

  if (!topDead || topDead.length === 0) {
    return (
      <section className="w-full max-w-2xl mx-auto px-4 py-8">
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-red-400">
            Hall of the Dead
          </h2>
          <p className="text-slate-300 mb-4">
            No souls have entered the Hall yet. The tower awaits...
          </p>
          <Link
            href="/hall-of-the-dead"
            className="inline-block text-red-400 hover:text-red-300 underline"
          >
            View Full Leaderboard →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-2xl mx-auto px-4 py-8">
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-red-400">Hall of the Dead</h2>
          <Link
            href="/hall-of-the-dead"
            className="text-sm text-red-400 hover:text-red-300 underline"
          >
            View All →
          </Link>
        </div>
        <p className="text-slate-300 text-sm mb-4">
          Remember those who have fallen. Five deaths and your account is
          permanently deleted.
        </p>
        <div className="space-y-2">
          {topDead.map((player, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-sm font-mono w-6">
                  #{index + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">
                      {player.characterName}
                    </span>
                    {player.isPermanentlyDead && (
                      <span className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded">
                        PERMANENTLY DEAD
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    Level {player.level} • {player.deathCount} death
                    {player.deathCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500 text-right">
                {player.lastDeathCause}
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/hall-of-the-dead"
          className="mt-4 inline-block w-full text-center rounded-lg px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800/50 transition-colors"
        >
          View Full Leaderboard
        </Link>
      </div>
    </section>
  );
}

