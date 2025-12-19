"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

/**
 * Melvor Idle-inspired skill training page
 * 
 * Features:
 * - View all training skills
 * - See available actions for each skill
 * - Start/stop training actions
 * - Monitor active action progress
 * - View skill levels and XP progress
 */
export default function TrainingPage() {
  const [autoCompleteInterval, setAutoCompleteInterval] = useState<NodeJS.Timeout | null>(null);

  const utils = api.useUtils();
  const { data: mySkills, isLoading: skillsLoading } = api.skillTraining.getMySkills.useQuery();
  const { data: activeAction, isLoading: actionLoading } = api.skillTraining.getActiveAction.useQuery(
    undefined,
    {
      refetchInterval: 1000, // Poll every second for progress updates
    }
  );

  const startActionMutation = api.skillTraining.startAction.useMutation({
    onSuccess: () => {
      toast.success("Training started!");
      void utils.skillTraining.getActiveAction.invalidate();
      void utils.skillTraining.getMySkills.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start training");
    },
  });

  const stopActionMutation = api.skillTraining.stopAction.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      void utils.skillTraining.getActiveAction.invalidate();
      void utils.skillTraining.getMySkills.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to stop training");
    },
  });

  const completeActionMutation = api.skillTraining.completeAction.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(
          `Action completed! +${data.xpGained} XP${data.leveledUp ? " (Level Up!)" : ""}`
        );
        if (data.itemsGained.length > 0) {
          toast.success(`Gained: ${data.itemsGained.map((i) => `${i.quantity}x item`).join(", ")}`);
        }
      } else {
        toast.error("Action failed");
      }
      void utils.skillTraining.getActiveAction.invalidate();
      void utils.skillTraining.getMySkills.invalidate();
      // TODO: Invalidate inventory when inventory router exists
    },
    onError: (error) => {
      toast.error(error.message || "Failed to complete action");
    },
  });

  // Auto-complete actions when ready
  useEffect(() => {
    if (activeAction?.isReady && !autoCompleteInterval) {
      const interval = setInterval(() => {
        completeActionMutation.mutate();
      }, 500); // Check every 500ms
      setAutoCompleteInterval(interval);
    } else if (!activeAction?.isReady && autoCompleteInterval) {
      clearInterval(autoCompleteInterval);
      setAutoCompleteInterval(null);
    }

    return () => {
      if (autoCompleteInterval) {
        clearInterval(autoCompleteInterval);
      }
    };
  }, [activeAction?.isReady, autoCompleteInterval, completeActionMutation]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (skillsLoading || actionLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <h1 className="text-2xl font-bold text-cyan-400">Skill Training</h1>
          <p className="mt-2 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cyan-400">Skill Training</h1>
          <p className="mt-2 text-slate-400">
            Train skills by performing repeatable actions. Actions run automatically until you stop
            or run out of resources.
          </p>
        </div>

        {/* Active Action Status */}
        {activeAction && (
          <div className="mb-6 rounded-xl border border-cyan-500/50 bg-cyan-500/10 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-cyan-400">
                Currently Training: {activeAction.action.name}
              </h2>
              <button
                onClick={() => stopActionMutation.mutate()}
                disabled={stopActionMutation.isPending}
                className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
              >
                {stopActionMutation.isPending ? "Stopping..." : "Stop"}
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Skill:</span>
                <span className="font-semibold text-cyan-300">
                  {activeAction.action.skill.name} (Level {activeAction.action.requiredLevel}+)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Actions Completed:</span>
                <span className="font-semibold">{activeAction.actionsCompleted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">XP per Action:</span>
                <span className="font-semibold">{activeAction.action.xpReward}</span>
              </div>
              {activeAction.action.actionTimeSeconds > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Time Remaining:</span>
                    <span className="font-semibold">
                      {activeAction.isReady
                        ? "Ready!"
                        : formatTime(activeAction.timeUntilCompletion)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-300"
                      style={{ width: `${activeAction.progressPct}%` }}
                    />
                  </div>
                </>
              )}
              {activeAction.action.staminaCost > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Stamina Cost:</span>
                  <span className="font-semibold text-blue-400">
                    {activeAction.action.staminaCost} SP
                  </span>
                </div>
              )}
              {activeAction.action.inputItems.length > 0 && (
                <div>
                  <span className="text-slate-300">Consumes:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {activeAction.action.inputItems.map((input) => (
                      <span
                        key={input.id}
                        className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400"
                      >
                        {input.quantity}x {input.item.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {activeAction.action.outputItems.length > 0 && (
                <div>
                  <span className="text-slate-300">Produces:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {activeAction.action.outputItems.map((output) => (
                      <span
                        key={output.id}
                        className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-400"
                      >
                        {output.minQuantity === output.maxQuantity
                          ? `${output.minQuantity}x`
                          : `${output.minQuantity}-${output.maxQuantity}x`}{" "}
                        {output.item.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skills List */}
        <div className="space-y-6">
          {mySkills?.map((playerSkill) => {
            const skill = playerSkill.skill;
            const canTrain = !activeAction || activeAction.action.skillId === skill.id;

            return (
              <div
                key={skill.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-6"
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-cyan-400">{skill.name}</h2>
                      {skill.description && (
                        <p className="mt-1 text-sm text-slate-400">{skill.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-100">
                        Level {playerSkill.level} / {skill.maxLevel}
                      </div>
                      <div className="text-xs text-slate-400">
                        {playerSkill.progress.current.toLocaleString()} /{" "}
                        {playerSkill.progress.needed.toLocaleString()} XP
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-cyan-500 transition-all"
                      style={{ width: `${playerSkill.progress.progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Available Actions */}
                {playerSkill.availableActions.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-sm font-semibold text-slate-300">
                      Available Actions
                    </h3>
                    <div className="space-y-2">
                      {playerSkill.availableActions.map((action) => {
                        const isActive = activeAction?.actionId === action.id;
                        const isLocked = playerSkill.level < action.requiredLevel;

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
                                  {action.staminaCost > 0 && (
                                    <span className="rounded bg-purple-500/20 px-2 py-1 text-purple-400">
                                      {action.staminaCost} SP
                                    </span>
                                  )}
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
                              {!isActive && canTrain && (
                                <button
                                  onClick={() => startActionMutation.mutate({ actionId: action.id })}
                                  disabled={
                                    startActionMutation.isPending ||
                                    !!activeAction ||
                                    isLocked
                                  }
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
                  </div>
                )}

                {/* Locked Actions */}
                {playerSkill.lockedActions.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-400">Locked Actions</h3>
                    <div className="space-y-2">
                      {playerSkill.lockedActions.map((action) => (
                        <div
                          key={action.id}
                          className="rounded-lg border border-slate-700 bg-slate-900/20 p-3 opacity-60"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-slate-400">{action.name}</h4>
                              {action.description && (
                                <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                              )}
                            </div>
                            <span className="ml-4 rounded bg-slate-700/50 px-2 py-1 text-xs text-slate-400">
                              Requires Level {action.requiredLevel}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {playerSkill.availableActions.length === 0 &&
                  playerSkill.lockedActions.length === 0 && (
                    <p className="text-sm text-slate-400">No actions available for this skill yet.</p>
                  )}
              </div>
            );
          })}

          {(!mySkills || mySkills.length === 0) && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
              <p className="text-slate-400">No skills available yet.</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Link
            href="/hub"
            className="inline-block rounded-xl bg-cyan-500/20 px-6 py-3 text-cyan-400 transition hover:bg-cyan-500/30"
          >
            Return to Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
