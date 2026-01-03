"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { getQuestRepeatabilityLabel } from "~/lib/utils/quest-step-summary";

export default function ContentQuestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [repeatabilityFilter, setRepeatabilityFilter] = useState<string>("");
  const [occupationFilter, setOccupationFilter] = useState<string>("");
  const [minLevelFilter, setMinLevelFilter] = useState<number | undefined>();

  const { data: quests, isLoading } = api.content.quests.list.useQuery({
    status: statusFilter || undefined,
    repeatability: repeatabilityFilter || undefined,
    occupationType: occupationFilter || undefined,
    minLevel: minLevelFilter,
    limit: 100,
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      DRAFT: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Draft" },
      PUBLISHED: { bg: "bg-green-500/20", text: "text-green-400", label: "Published" },
      ARCHIVED: { bg: "bg-red-500/20", text: "text-red-400", label: "Archived" },
      ACTIVE: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Active" },
      DISABLED: { bg: "bg-gray-500/20", text: "text-gray-400", label: "Disabled" },
    };
    const badge = badges[status] ?? { bg: "bg-gray-500/20", text: "text-gray-400", label: status };
    return (
      <span className={`inline-flex rounded-full ${badge.bg} ${badge.text} px-2 py-1 text-xs`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">Quest Templates</h2>
          <p className="mt-1 text-sm text-slate-400">Manage game quest templates</p>
        </div>
        <Link
          href="/content/quests/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          Create Quest
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4 md:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Repeatability</label>
          <select
            value={repeatabilityFilter}
            onChange={(e) => setRepeatabilityFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All</option>
            <option value="ONCE">Once</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="REPEATABLE">Repeatable</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Occupation</label>
          <input
            type="text"
            value={occupationFilter}
            onChange={(e) => setOccupationFilter(e.target.value)}
            placeholder="Filter by occupation"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Min Level</label>
          <input
            type="number"
            value={minLevelFilter ?? ""}
            onChange={(e) => setMinLevelFilter(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Min level"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">Loading quests...</p>
        </div>
      ) : quests && quests.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Repeatability</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Min Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Occupation</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Updated</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {quests.map((quest) => (
                <tr key={quest.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium">{quest.name}</td>
                  <td className="px-4 py-3">{getStatusBadge(quest.status)}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {getQuestRepeatabilityLabel(quest.repeatability)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {quest.recommendedMinLevel ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{quest.occupationType ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {new Date(quest.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/content/quests/${quest.id}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No quests found</p>
          <Link
            href="/content/quests/new"
            className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
          >
            Create your first quest
          </Link>
        </div>
      )}
    </div>
  );
}
