"use client";

import { use } from "react";
import { api } from "~/trpc/react";
import { ProgressBar } from "../../hub/jobs/_components/progress-bar";
import Link from "next/link";

type Props = {
  params: Promise<{ jobKey: string }>;
};

export default function JobDetailPage({ params }: Props) {
  const { jobKey } = use(params);
  
  const { data: jobs } = api.jobs.listJobs.useQuery();
  const job = jobs?.find((j) => j.key === jobKey);
  
  const { data: progression } = api.jobs.getJobProgression.useQuery(
    { jobId: job?.id ?? "" },
    { enabled: !!job?.id }
  );
  
  const { data: recipes } = api.recipes.listRecipes.useQuery(
    { 
      jobId: job?.id,
      playerLevel: progression?.level,
    },
    { enabled: !!job?.id && !!progression }
  );
  
  const { data: nodes } = api.gathering.listNodes.useQuery(
    { 
      jobId: job?.id,
      playerLevel: progression?.level,
    },
    { enabled: !!job?.id && !!progression }
  );

  const utils = api.useUtils();
  const setActiveJobMutation = api.jobs.setActiveJob.useMutation({
    onSuccess: () => {
      void utils.jobs.getJobProgression.invalidate({ jobId: job?.id ?? "" });
    },
  });

  if (!job) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>←</span>
            <span>Back to Jobs</span>
          </Link>
        </div>
        <div className="mt-4 rounded bg-red-500/20 border border-red-500/50 p-4">
          <p className="text-red-400 font-semibold">Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <div>
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>←</span>
            <span>Back to Jobs</span>
          </Link>
        </div>
        
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">{job.name}</h1>
            <p className="mt-2 text-slate-400">{job.description}</p>
            <div className="mt-2">
              <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                {job.category}
              </span>
            </div>
          </div>
          {progression && !progression.active && (
            <button
              onClick={() => {
                setActiveJobMutation.mutate({ jobId: job.id });
              }}
              disabled={setActiveJobMutation.isPending}
              className="rounded bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {setActiveJobMutation.isPending ? "Activating..." : "Set Active"}
            </button>
          )}
          {progression?.active && (
            <span className="rounded bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400">
              Active
            </span>
          )}
        </div>

        {progression && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              Progression
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Level</span>
                <span className="font-semibold text-cyan-400">
                  {progression.level} {progression.isMaxLevel ? "(Max)" : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total XP</span>
                <span className="font-semibold text-slate-100">
                  {progression.totalXp}
                </span>
              </div>
              {!progression.isMaxLevel && (
                <ProgressBar
                  current={progression.xpInLevel}
                  max={progression.xpToNext}
                  label="XP to Next Level"
                />
              )}
            </div>
          </div>
        )}

        {recipes && recipes.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              Recipes
            </h2>
            <div className="space-y-3">
              {recipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/hub/recipes/${recipe.id}`}
                  className="block rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/70"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-100">
                        {recipe.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Difficulty: {"★".repeat(recipe.difficulty)} | Output:{" "}
                        {recipe.outputQty}x {recipe.outputItem.name}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {nodes && nodes.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              Gathering Nodes
            </h2>
            <div className="space-y-3">
              {nodes.map((node) => {
                const minutes = Math.floor((node.gatherTimeSeconds ?? 0) / 60);
                const seconds = (node.gatherTimeSeconds ?? 0) % 60;
                const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                
                return (
                  <div
                    key={node.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <h3 className="font-semibold text-slate-100">{node.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Danger: {"⚠".repeat(node.dangerTier)} | Yields:{" "}
                      {node.yields
                        .map(
                          (y) =>
                            `${y.minQty}-${y.maxQty}x ${y.item.name}`
                        )
                        .join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Req Level: {node.requiredJobLevel ?? 1} | Time: {timeDisplay} | XP: {node.xpReward ?? 10}
                      {node.tier && ` | Tier: ${node.tier}`}
                      {node.cooldownSeconds && ` | Cooldown: ${node.cooldownSeconds}s`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(!recipes || recipes.length === 0) && (!nodes || nodes.length === 0) && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
            <p className="text-slate-400">No recipes or gathering nodes available for this job.</p>
          </div>
        )}
    </div>
  );
}
