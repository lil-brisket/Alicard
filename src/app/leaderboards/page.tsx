"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

type TabType = "pve" | "pvp" | "jobs";

export default function LeaderboardsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("pve");

  // PvE Query
  const { data: pveData, isLoading: pveLoading } =
    api.leaderboards.getPve.useQuery({
      timeframe: "all-time",
      limit: 50,
    });

  // PvP Query
  const { data: pvpData, isLoading: pvpLoading } =
    api.leaderboards.getPvp.useQuery({
      timeframe: "all-time",
      limit: 50,
      minMatches: 20,
    });

  // Jobs Query
  const { data: jobsData, isLoading: jobsLoading } =
    api.leaderboards.getJobs.useQuery({
      timeframe: "all-time",
      limit: 50,
    });

  const isLoading =
    (activeTab === "pve" && pveLoading) ||
    (activeTab === "pvp" && pvpLoading) ||
    (activeTab === "jobs" && jobsLoading);

  const currentData =
    activeTab === "pve"
      ? pveData
      : activeTab === "pvp"
        ? pvpData
        : jobsData;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">Leaderboards</h1>
            <p className="mt-2 text-slate-400">
              See how you rank against other players
            </p>
          </div>
          <Link
            href="/hub"
            className="inline-block rounded-xl bg-cyan-500/20 px-6 py-3 text-cyan-400 transition hover:bg-cyan-500/30"
          >
            Return to Hub
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("pve")}
            className={`px-4 py-2 font-medium transition ${
              activeTab === "pve"
                ? "border-b-2 border-cyan-400 text-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            PvE
          </button>
          <button
            onClick={() => setActiveTab("pvp")}
            className={`px-4 py-2 font-medium transition ${
              activeTab === "pvp"
                ? "border-b-2 border-cyan-400 text-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            PvP
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2 font-medium transition ${
              activeTab === "jobs"
                ? "border-b-2 border-cyan-400 text-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Jobs
          </button>
        </div>


        {/* Table */}
        {isLoading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
            <p className="text-slate-400">Loading leaderboard...</p>
          </div>
        ) : !currentData || currentData.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-100">
              No Data Available
            </h2>
            <p className="mt-2 text-slate-400">
              No players have stats yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Player
                  </th>
                  {activeTab === "pve" && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">
                      Kills
                    </th>
                  )}
                  {activeTab === "pvp" && (
                    <>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">
                        Kills
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">
                        Record
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">
                        Win %
                      </th>
                    </>
                  )}
                  {activeTab === "jobs" && (
                    <>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">
                        Total XP
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                        Top Job
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentData.map((entry) => {
                  const isCurrentUser = session?.user?.id === entry.userId;
                  return (
                    <tr
                      key={entry.userId}
                      className={`border-b border-slate-800/50 transition ${
                        isCurrentUser
                          ? "bg-cyan-500/10 hover:bg-cyan-500/20"
                          : "hover:bg-slate-900/50"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-slate-400">
                        #{entry.rank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {entry.avatarUrl && (
                            <img
                              src={entry.avatarUrl}
                              alt={entry.username}
                              className="h-8 w-8 rounded-full"
                            />
                          )}
                          <span className="font-medium text-slate-100">
                            {entry.username}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-cyan-400">
                                (You)
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      {activeTab === "pve" && (
                        <td className="px-4 py-3 text-right text-sm text-slate-300">
                          {entry.pveKills.toLocaleString()}
                        </td>
                      )}
                      {activeTab === "pvp" && (
                        <>
                          <td className="px-4 py-3 text-right text-sm text-slate-300">
                            {entry.pvpKills.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-slate-300">
                            {entry.pvpWins}-{entry.pvpLosses}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-slate-300">
                            {entry.winPct.toFixed(1)}%
                          </td>
                        </>
                      )}
                      {activeTab === "jobs" && (
                        <>
                          <td className="px-4 py-3 text-right text-sm text-slate-300">
                            {entry.jobXpTotal.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {entry.topJob ? (
                              <div>
                                <span className="font-medium">
                                  {entry.topJob.name}
                                </span>
                                <span className="ml-2 text-xs text-slate-500">
                                  ({entry.topJob.xp.toLocaleString()} XP)
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination info */}
        {currentData && currentData.length > 0 && (
          <div className="mt-4 text-center text-sm text-slate-400">
            Showing top {currentData.length} players
          </div>
        )}
      </div>
    </div>
  );
}
