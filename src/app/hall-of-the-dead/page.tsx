"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { SectionCard } from "~/components/ui/section-card";
import { ListRow } from "~/components/ui/list-row";

export default function HallOfTheDeadPage() {
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = api.hallOfTheDead.getLeaderboard.useQuery({
    page,
    limit,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-red-400">
          Hall of the Dead
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          A memorial to those who have fallen in the tower. Five deaths and
          your account is permanently deleted.
        </p>
      </div>

      {isLoading ? (
        <SectionCard>
          <p className="text-center text-slate-400">Loading the fallen...</p>
        </SectionCard>
      ) : !data || data.players.length === 0 ? (
        <SectionCard>
          <p className="text-center text-slate-300">
            No souls have entered the Hall yet. The tower awaits...
          </p>
        </SectionCard>
      ) : (
        <>
          <SectionCard>
            <div className="space-y-3">
              {data.players.map((player, index) => {
                const rank = (page - 1) * limit + index + 1;
                return (
                  <ListRow key={rank}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="text-sm font-mono text-slate-400 shrink-0">
                        #{rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-200">
                          {player.characterName}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Level {player.level} • {player.deathCount} death{player.deathCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {player.isPermanentlyDead ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-300">
                            Permanently Dead
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300">
                            {5 - player.deathCount} lives remaining
                          </span>
                        )}
                      </div>
                    </div>
                    {player.lastDeathCause && (
                      <div className="text-xs text-slate-400 mt-2">
                        Last death: {player.lastDeathCause}
                      </div>
                    )}
                  </ListRow>
                );
              })}
            </div>
          </SectionCard>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, data.total)} of {data.total} fallen
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-slate-700/50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-slate-300">
                  Page {page} of {data.totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                  disabled={page === data.totalPages}
                  className="px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-slate-700/50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

