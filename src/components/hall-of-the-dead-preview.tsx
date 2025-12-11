"use client";

import Link from "next/link";
import { api } from "@/trpc/react";

export function HallOfTheDeadPreview() {
  const { data: dead, isLoading, error } = api.character.hallOfTheDead.useQuery({
    limit: 5,
  });

  return (
    <section className="py-12 border-t border-slate-900 bg-gradient-to-b from-black to-slate-950">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Hall of the Dead</h2>
            <p className="text-sm text-slate-400">
              The tower keeps score. These players didn&apos;t make it.
            </p>
          </div>
          <Link
            href="/hall-of-the-dead"
            className="text-xs text-slate-300 underline underline-offset-4"
          >
            View full list
          </Link>
        </div>

        {isLoading && (
          <p className="text-slate-500 text-sm">
            Summoning the fallen…
          </p>
        )}

        {error && (
          <p className="text-red-500 text-sm">
            Error loading hall of the dead: {error.message}
          </p>
        )}

        {!isLoading && !error && (!dead || dead.length === 0) && (
          <p className="text-slate-500 text-sm">
            No recorded deaths… yet. Be the first — or don&apos;t.
          </p>
        )}

        {!isLoading && dead && dead.length > 0 && (
          <ul className="space-y-2">
            {dead.map((entry, index) => (
              <li
                key={entry.id}
                className="flex items-center justify-between text-sm border border-slate-900 rounded-xl px-3 py-2 bg-black/40"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-5">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-medium">
                      {entry.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.user?.name ?? "Unknown"} • L{entry.level} •{" "}
                      {entry.floorsCleared} floors
                    </p>
                  </div>
                </div>
                <p className="text-xs text-red-300 max-w-[160px] text-right line-clamp-2">
                  {entry.deathReason ?? "Cause of death unknown"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

