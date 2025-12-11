"use client";

import { api } from "@/trpc/react";
import Link from "next/link";

export default function HallOfTheDeadPage() {
  const { data: dead, isLoading } = api.character.hallOfTheDead.useQuery({
    limit: 50,
  });

  return (
    <main className="min-h-screen bg-black text-slate-100 py-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Hall of the Dead</h1>
            <p className="text-slate-400 mt-2 max-w-xl">
              Every name here represents a fallen player. Five deaths and Alicard
              erases you — but the Hall remembers.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-slate-300 underline underline-offset-4"
          >
            Back to landing
          </Link>
        </div>

        {isLoading && (
          <p className="text-slate-400">Calling the names of the fallen…</p>
        )}

        {!isLoading && (!dead || dead.length === 0) && (
          <p className="text-slate-400">
            No one has fallen yet. The tower is waiting.
          </p>
        )}

        {!isLoading && dead && dead.length > 0 && (
          <div className="overflow-x-auto border border-slate-800 rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">
                    #
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">
                    Character
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">
                    Player
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">
                    Level
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">
                    Floors Cleared
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">
                    Death Reason
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">
                    Time of Death
                  </th>
                </tr>
              </thead>
              <tbody>
                {dead.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={index % 2 === 0 ? "bg-black" : "bg-slate-950"}
                  >
                    <td className="py-3 px-4 text-slate-500">{index + 1}</td>
                    <td className="py-3 px-4">{entry.name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {entry.user?.name ?? "Unknown"}
                    </td>
                    <td className="py-3 px-4">{entry.level}</td>
                    <td className="py-3 px-4">{entry.floorsCleared}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {entry.deathReason ?? "Unknown"}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {entry.deathAt
                        ? new Date(entry.deathAt).toLocaleString()
                        : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

