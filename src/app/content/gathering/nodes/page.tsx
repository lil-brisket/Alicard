"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function GatheringNodesPage() {
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [tier, setTier] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState<boolean | undefined>(true);
  const [query, setQuery] = useState<string>("");

  const { data: nodes, isLoading } = api.content.gatheringNodes.list.useQuery({
    jobId,
    tier,
    isActive,
    query: query || undefined,
    limit: 100,
  });

  const { data: jobs } = api.jobs.listJobs.useQuery();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">Gathering Nodes</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage gathering nodes and their yields
          </p>
        </div>
        <Link
          href="/content/gathering/nodes/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          Create Node
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Job
            </label>
            <select
              value={jobId || ""}
              onChange={(e) => setJobId(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All Jobs</option>
              {jobs?.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Tier
            </label>
            <select
              value={tier || ""}
              onChange={(e) => setTier(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All Tiers</option>
              {[1, 2, 3, 4, 5].map((t) => (
                <option key={t} value={t}>
                  Tier {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Status
            </label>
            <select
              value={isActive === undefined ? "" : isActive ? "active" : "inactive"}
              onChange={(e) => {
                if (e.target.value === "") setIsActive(undefined);
                else setIsActive(e.target.value === "active");
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Search
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nodes..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">Loading nodes...</p>
        </div>
      ) : nodes && nodes.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Job
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Tier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Req Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  XP
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Danger
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Yields
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Active
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {nodes.map((node) => (
                <tr key={node.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium">{node.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {node.job.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {node.tier}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {node.requiredJobLevel}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {node.gatherTimeSeconds}s
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {node.xpReward}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {node.dangerTier}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {node.yields.length} item{node.yields.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3">
                    {node.isActive ? (
                      <span className="inline-flex rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/content/gathering/nodes/${node.id}`}
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
          <p className="text-slate-400">No nodes found</p>
          <Link
            href="/content/gathering/nodes/new"
            className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
          >
            Create your first node
          </Link>
        </div>
      )}
    </div>
  );
}

