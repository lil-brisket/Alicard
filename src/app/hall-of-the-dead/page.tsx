"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function HallOfTheDeadPage() {
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = api.hallOfTheDead.getLeaderboard.useQuery({
    page,
    limit,
  });

  return (
    <main className="min-h-screen bg-black text-slate-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-red-400">
            Hall of the Dead
          </h1>
          <p className="text-slate-300 text-lg">
            A memorial to those who have fallen in the tower. Five deaths and
            your account is permanently deleted.
          </p>
        </div>

        {isLoading ? (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-400">Loading the fallen...</p>
          </div>
        ) : !data || data.players.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-300 text-lg">
              No souls have entered the Hall yet. The tower awaits...
            </p>
          </div>
        ) : (
          <>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Character
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Deaths
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Last Death Cause
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {data.players.map((player, index) => {
                      const rank = (page - 1) * limit + index + 1;
                      return (
                        <tr
                          key={rank}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400">
                            #{rank}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-slate-200">
                              {player.characterName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                            {player.level}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                            {player.deathCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {player.isPermanentlyDead ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-300">
                                Permanently Dead
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300">
                                {5 - player.deathCount} lives remaining
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                            {player.lastDeathCause}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, data.total)} of {data.total} fallen
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

