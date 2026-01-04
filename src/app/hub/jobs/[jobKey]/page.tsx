"use client";

import { use } from "react";
import { api } from "~/trpc/react";
import { ProgressBar } from "../_components/progress-bar";
import Link from "next/link";
import toast from "react-hot-toast";

type Props = {
  params: Promise<{ jobKey: string }>;
};

export default function JobDetailPage({ params }: Props) {
  const { jobKey } = use(params);
  
  const { data: jobs } = api.jobs.listJobs.useQuery();
  const job = jobs?.find((j) => j.key === jobKey);
  
  const { data: progression } = api.jobs.getJobProgression.useQuery(
    { jobId: job?.id ?? "" },
    { 
      enabled: !!job?.id,
      refetchInterval: 2000, // Refetch every 2 seconds for real-time progress
    }
  );
  
  const { data: trainingSkills } = api.skillTraining.getSkillsByJob.useQuery(
    { jobId: job?.id ?? "" },
    { enabled: !!job?.id }
  );

  const { data: mySkills } = api.skillTraining.getMySkills.useQuery(
    job?.id ? { jobId: job.id } : undefined,
    {
      refetchInterval: 2000, // Refetch every 2 seconds for real-time progress
    }
  );

  const { data: activeAction } = api.skillTraining.getActiveAction.useQuery(
    undefined,
    {
      refetchInterval: 1000, // Refetch every second for real-time progress
    }
  );

  const { data: gatheringNodes } = api.gathering.listNodes.useQuery(
    { jobId: job?.id },
    { enabled: !!job?.id }
  );

  const utils = api.useUtils();
  const startActionMutation = api.skillTraining.startAction.useMutation({
    onSuccess: () => {
      toast.success("Training started!");
      void utils.skillTraining.getActiveAction.invalidate();
      void utils.skillTraining.getMySkills.invalidate();
      void utils.jobs.getJobProgression.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start training");
    },
  });

  const stopActionMutation = api.skillTraining.stopAction.useMutation({
    onSuccess: () => {
      toast.success("Training stopped!");
      void utils.skillTraining.getActiveAction.invalidate();
      void utils.skillTraining.getMySkills.invalidate();
      void utils.jobs.getJobProgression.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to stop training");
    },
  });


  if (!job) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/hub/jobs"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>←</span>
            <span>Back to Jobs</span>
          </Link>
        </div>
        <p className="text-slate-400">Job not found</p>
      </div>
    );
  }

  return (
    <div>
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/hub/jobs"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>←</span>
            <span>Back to Jobs</span>
          </Link>
        </div>
        
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
                  current={progression.xpInLevel}
                  max={progression.xpToNext}
                  label="XP to Next Level"
                />
              )}
            </div>
          </div>
        )}

        {/* Gathering Nodes Section */}
        {gatheringNodes && gatheringNodes.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              Gathering Nodes
            </h2>
            <div className="space-y-3">
              {gatheringNodes.map((node) => {
                const isLocked = progression ? progression.level < node.requiredJobLevel : true;
                const timeMinutes = Math.floor(node.gatherTimeSeconds / 60);
                const timeSeconds = node.gatherTimeSeconds % 60;
                const timeDisplay = timeMinutes > 0 
                  ? `${timeMinutes}m ${timeSeconds}s`
                  : `${timeSeconds}s`;

                return (
                  <div
                    key={node.id}
                    className={`rounded-xl border p-4 ${
                      isLocked
                        ? "border-slate-700/50 bg-slate-900/20 opacity-60"
                        : "border-slate-800 bg-slate-950/60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-100">{node.name}</h3>
                          {isLocked && (
                            <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">
                              Requires Level {node.requiredJobLevel}
                            </span>
                          )}
                          <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                            Tier {node.tier}
                          </span>
                          {node.dangerTier > 0 && (
                            <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                              Danger {node.dangerTier}
                            </span>
                          )}
                        </div>
                        {node.description && (
                          <p className="mt-1 text-sm text-slate-400">{node.description}</p>
                        )}
                        <div className="mt-2 text-xs text-slate-400">
                          <span>Req Level: {node.requiredJobLevel}</span>
                          <span className="mx-2">|</span>
                          <span>Time: {timeDisplay}</span>
                          <span className="mx-2">|</span>
                          <span className="text-green-400">XP: {node.xpReward}</span>
                        </div>
                        {node.yields && node.yields.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-slate-400">Yields: </span>
                            {node.yields.map((yield_, idx) => (
                              <span key={yield_.id} className="text-xs text-green-400">
                                {idx > 0 && ", "}
                                {yield_.minQty === yield_.maxQty
                                  ? `${yield_.minQty}x`
                                  : `${yield_.minQty}-${yield_.maxQty}x`}{" "}
                                {yield_.item.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Actions Section - Training Skills and Recipes */}
        {trainingSkills && trainingSkills.length > 0 ? (
          <div className="mt-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              Available Actions
            </h2>
            <div className="space-y-4">
              {/* Training Skills Actions */}
              {trainingSkills?.map((skill) => {
                const playerSkill = mySkills?.find((ps) => ps.skillId === skill.id);
                if (!playerSkill) return null;

                return (
                  <div
                    key={skill.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-cyan-400">{skill.name}</h3>
                      {skill.description && (
                        <p className="mt-1 text-sm text-slate-400">{skill.description}</p>
                      )}
                    </div>

                    {/* Skill Actions */}
                    {skill.actions.length > 0 && (
                      <div className="space-y-2">
                        {skill.actions.map((action) => {
                          const isActive = activeAction?.actionId === action.id;
                          const isLocked = progression ? progression.level < action.requiredLevel : true;
                          const canTrain = !activeAction || activeAction.action.skillId === skill.id;

                          return (
                            <div
                              key={action.id}
                              className={`rounded-lg border p-3 ${
                                isActive
                                  ? "border-cyan-500/50 bg-cyan-500/10"
                                  : "border-slate-700 bg-slate-900/40"
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-slate-100">{action.name}</h4>
                                    {isActive && (
                                      <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400">
                                        Active
                                      </span>
                                    )}
                                    {isLocked && (
                                      <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">
                                        Requires Level {action.requiredLevel}
                                      </span>
                                    )}
                                  </div>
                                  {action.description && (
                                    <p className="mt-1 text-xs text-slate-400">{action.description}</p>
                                  )}
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded bg-blue-500/20 px-2 py-1 text-blue-400">
                                      {action.actionTimeSeconds}s per action
                                    </span>
                                    <span className="rounded bg-green-500/20 px-2 py-1 text-green-400">
                                      +{action.xpReward} XP
                                    </span>
                                    {action.successRate < 1.0 && (
                                      <span className="rounded bg-yellow-500/20 px-2 py-1 text-yellow-400">
                                        {(action.successRate * 100).toFixed(0)}% success
                                      </span>
                                    )}
                                  </div>
                                  {action.inputItems.length > 0 && (
                                    <div className="mt-2">
                                      <span className="text-xs text-slate-400">Requires: </span>
                                      {action.inputItems.map((input, idx) => (
                                        <span key={input.id} className="text-xs text-red-400">
                                          {idx > 0 && ", "}
                                          {input.quantity}x {input.item.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {action.outputItems.length > 0 && (
                                    <div className="mt-2">
                                      <span className="text-xs text-slate-400">Produces: </span>
                                      {action.outputItems.map((output, idx) => (
                                        <span key={output.id} className="text-xs text-green-400">
                                          {idx > 0 && ", "}
                                          {output.minQuantity === output.maxQuantity
                                            ? `${output.minQuantity}x`
                                            : `${output.minQuantity}-${output.maxQuantity}x`}{" "}
                                          {output.item.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {!isActive && canTrain && !isLocked && (
                                  <button
                                    onClick={() => startActionMutation.mutate({ actionId: action.id })}
                                    disabled={startActionMutation.isPending || !!activeAction}
                                    className="ml-4 rounded bg-cyan-500/20 px-4 py-2 text-sm text-cyan-400 transition hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {startActionMutation.isPending ? "Starting..." : "Start"}
                                  </button>
                                )}
                                {isActive && (
                                  <button
                                    onClick={() => stopActionMutation.mutate()}
                                    disabled={stopActionMutation.isPending}
                                    className="ml-4 rounded bg-red-500/20 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
                                  >
                                    {stopActionMutation.isPending ? "Stopping..." : "Stop"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

            </div>
          </div>
        ) : null}
    </div>
  );
}
