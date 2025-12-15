"use client";

import { api } from "~/trpc/react";
import Link from "next/link";

export default function ContentDashboardPage() {
  const { data: itemStats } = api.content.items.list.useQuery({
    limit: 1,
  });
  
  const { data: monsterStats } = api.content.monsters.list.useQuery({
    limit: 1,
  });
  
  const { data: questStats } = api.content.quests.list.useQuery({
    limit: 1,
  });
  
  const { data: mapStats } = api.content.maps.list.useQuery({
    limit: 1,
  });

  const stats = [
    {
      name: "Items",
      count: itemStats?.length ?? 0,
      href: "/content/items",
      color: "cyan",
    },
    {
      name: "Monsters",
      count: monsterStats?.length ?? 0,
      href: "/content/monsters",
      color: "red",
    },
    {
      name: "Quests",
      count: questStats?.length ?? 0,
      href: "/content/quests",
      color: "green",
    },
    {
      name: "Maps",
      count: mapStats?.length ?? 0,
      href: "/content/maps",
      color: "purple",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-cyan-400">Content Dashboard</h2>
        <p className="mt-1 text-sm text-slate-400">
          Manage all game content from one place
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 transition hover:border-cyan-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{stat.name}</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {stat.count}
                </p>
              </div>
              <div
                className={`rounded-full bg-${stat.color}-500/20 p-3 text-${stat.color}-400`}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Link
              href="/content/items/new"
              className="block rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              Create New Item
            </Link>
            <Link
              href="/content/monsters/new"
              className="block rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              Create New Monster
            </Link>
            <Link
              href="/content/quests/new"
              className="block rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              Create New Quest
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">
            Content Status
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Draft Items</span>
              <span className="font-medium text-yellow-400">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Active Content</span>
              <span className="font-medium text-green-400">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Disabled Content</span>
              <span className="font-medium text-red-400">0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
