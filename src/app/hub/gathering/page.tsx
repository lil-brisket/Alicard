"use client";

import React from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { NodeCard } from "./_components/node-card";

export default function GatheringPage() {
  const { data: nodes, isLoading } = api.gathering.listNodes.useQuery();
  const { data: jobs } = api.jobs.listJobs.useQuery();
  const [selectedJobId, setSelectedJobId] = React.useState<string | undefined>();

  const { data: filteredNodes } = api.gathering.listNodes.useQuery(
    { jobId: selectedJobId },
    { enabled: !!selectedJobId || selectedJobId === undefined }
  );

  const displayNodes = selectedJobId ? filteredNodes : nodes;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-cyan-400">Gathering</h1>
        <p className="mt-2 text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] md:pb-24">
        <h1 className="text-2xl font-bold text-cyan-400">Gathering Nodes</h1>
        <p className="mt-2 text-slate-400">
          Collect resources from gathering nodes
        </p>

        {jobs && jobs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedJobId(undefined)}
              className={`rounded px-3 py-1 text-sm transition ${
                selectedJobId === undefined
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All
            </button>
            {jobs
              .filter((job) => job.category === "GATHER")
              .map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`rounded px-3 py-1 text-sm transition ${
                    selectedJobId === job.id
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {job.name}
                </button>
              ))}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {displayNodes && displayNodes.length > 0 ? (
            displayNodes.map((node) => (
              <GatheringNodeCard key={node.id} node={node} />
            ))
          ) : (
            <p className="text-slate-400">No gathering nodes found</p>
          )}
        </div>
    </div>
  );
}

function GatheringNodeCard({
  node,
}: {
  node: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    dangerTier: number;
    job: {
      name: string;
    };
    yields: Array<{
      minQty: number;
      maxQty: number;
      item: {
        name: string;
      };
    }>;
  };
}) {
  const utils = api.useUtils();
  const gatherMutation = api.gathering.gatherFromNode.useMutation({
    onSuccess: () => {
      // Invalidate inventory queries to refresh the inventory
      void utils.player.getInventory.invalidate();
    },
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <NodeCard node={node} />
      <div className="mt-4">
        <button
          onClick={() => {
            gatherMutation.mutate({ nodeId: node.id });
          }}
          disabled={gatherMutation.isPending}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-white transition hover:from-cyan-600 hover:to-emerald-600 disabled:opacity-50"
        >
          {gatherMutation.isPending ? "Gathering..." : "Gather"}
        </button>

        {gatherMutation.data && (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              gatherMutation.data.success
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/50 bg-red-500/10 text-red-400"
            }`}
          >
            {gatherMutation.data.success ? (
              <div>
                <p className="font-semibold">Gathering Successful!</p>
                {gatherMutation.data.items.length > 0 && (
                  <p className="mt-1 text-sm">
                    Received:{" "}
                    {gatherMutation.data.items
                      .map(
                        (item) =>
                          `${item.qty}x ${item.item?.name ?? "Unknown"}`
                      )
                      .join(", ")}
                  </p>
                )}
                <p className="mt-1 text-sm">
                  Gained {gatherMutation.data.xpGained} XP
                  {gatherMutation.data.leveledUp && " (Level Up!)"}
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold">Gathering Failed</p>
                <p className="mt-1 text-sm">
                  Gained {gatherMutation.data.xpGained} XP from the attempt
                </p>
              </div>
            )}
          </div>
        )}

        {gatherMutation.error && (
          <div className="mt-4 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-400">
            <p className="font-semibold">Error</p>
            <p className="mt-1 text-sm">{gatherMutation.error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
