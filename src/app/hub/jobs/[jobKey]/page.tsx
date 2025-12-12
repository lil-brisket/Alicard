"use client";

import { use } from "react";
import { api } from "~/trpc/react";
import { ProgressBar } from "../_components/progress-bar";
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
    { jobId: job?.id },
    { enabled: !!job?.id }
  );
  
  const { data: nodes } = api.gathering.listNodes.useQuery(
    { jobId: job?.id },
    { enabled: !!job?.id }
  );

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <p className="text-slate-400">Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <Link
          href="/hub/jobs"
          className="text-cyan-400 hover:text-cyan-300"
        >
          ← Back to Jobs
        </Link>
        
        <h1 className="mt-4 text-2xl font-bold text-cyan-400">{job.name}</h1>
        <p className="mt-2 text-slate-400">{job.description}</p>

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
                  current={progression.progress.current}
                  max={progression.progress.needed}
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
              {nodes.map((node) => (
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
