"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import {
  formatQuestStepSummary,
  getQuestStepTypeLabel,
  getQuestRewardTypeLabel,
  getQuestRepeatabilityLabel,
} from "~/lib/utils/quest-step-summary";

type Tab = "basics" | "steps" | "rewards" | "preview" | "history";

export default function QuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: quest, isLoading, refetch } = api.content.quests.get.useQuery({ id });
  const utils = api.useUtils();

  const [activeTab, setActiveTab] = useState<Tab>("basics");
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStepDialog, setShowStepDialog] = useState(false);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);

  // Form state
  const [basicsForm, setBasicsForm] = useState({
    name: "",
    slug: "",
    description: "",
    status: "DRAFT" as "DRAFT" | "ACTIVE" | "DISABLED" | "PUBLISHED" | "ARCHIVED",
    repeatability: "ONCE" as "ONCE" | "DAILY" | "WEEKLY" | "REPEATABLE",
    recommendedMinLevel: null as number | null,
    occupationType: "",
    prerequisiteQuestId: null as string | null,
    startTriggerType: "",
    startTriggerRefId: "",
  });

  // Step form state
  const [stepForm, setStepForm] = useState({
    type: "KILL_ENEMY" as
      | "KILL_ENEMY"
      | "GATHER_ITEM"
      | "CRAFT_ITEM"
      | "VISIT_LOCATION"
      | "DELIVER_ITEM"
      | "TALK_TO_NPC"
      | "INTERACT_NODE",
    title: "",
    description: "",
    targetRefType: "",
    targetRefId: "",
    quantity: 1,
    conditionsJson: null as Record<string, unknown> | null,
    isOptional: false,
  });

  // Reward form state
  const [rewardForm, setRewardForm] = useState({
    type: "GOLD" as "XP_CHARACTER" | "XP_OCCUPATION" | "ITEM" | "GOLD" | "RECIPE_UNLOCK" | "SKILL_UNLOCK",
    refId: "",
    amount: 0,
    probability: 1.0,
    notes: "",
  });

  useEffect(() => {
    if (quest) {
      setBasicsForm({
        name: quest.name,
        slug: quest.slug,
        description: quest.description ?? "",
        status: quest.status as typeof basicsForm.status,
        repeatability: quest.repeatability,
        recommendedMinLevel: quest.recommendedMinLevel,
        occupationType: quest.occupationType ?? "",
        prerequisiteQuestId: quest.prerequisiteQuestId,
        startTriggerType: quest.startTriggerType ?? "",
        startTriggerRefId: quest.startTriggerRefId ?? "",
      });
      setHasChanges(false);
    }
  }, [quest]);

  const updateQuest = api.content.quests.update.useMutation({
    onSuccess: () => {
      toast.success("Quest saved");
      setHasChanges(false);
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const archiveQuest = api.content.quests.archive.useMutation({
    onSuccess: () => {
      toast.success("Quest archived");
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cloneQuest = api.content.quests.clone.useMutation({
    onSuccess: (cloned) => {
      toast.success("Quest cloned");
      router.push(`/content/quests/${cloned.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addStep = api.content.quests.steps.addStep.useMutation({
    onSuccess: () => {
      toast.success("Step added");
      setShowStepDialog(false);
      setStepForm({
        type: "KILL_ENEMY",
        title: "",
        description: "",
        targetRefType: "",
        targetRefId: "",
        quantity: 1,
        conditionsJson: null,
        isOptional: false,
      });
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateStep = api.content.quests.steps.updateStep.useMutation({
    onSuccess: () => {
      toast.success("Step updated");
      setShowStepDialog(false);
      setEditingStepId(null);
      setStepForm({
        type: "KILL_ENEMY",
        title: "",
        description: "",
        targetRefType: "",
        targetRefId: "",
        quantity: 1,
        conditionsJson: null,
        isOptional: false,
      });
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteStep = api.content.quests.steps.deleteStep.useMutation({
    onSuccess: () => {
      toast.success("Step deleted");
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const reorderSteps = api.content.quests.steps.reorderSteps.useMutation({
    onSuccess: () => {
      toast.success("Steps reordered");
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addReward = api.content.quests.rewards.addReward.useMutation({
    onSuccess: () => {
      toast.success("Reward added");
      setShowRewardDialog(false);
      setRewardForm({
        type: "GOLD",
        refId: "",
        amount: 0,
        probability: 1.0,
        notes: "",
      });
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateReward = api.content.quests.rewards.updateReward.useMutation({
    onSuccess: () => {
      toast.success("Reward updated");
      setShowRewardDialog(false);
      setEditingRewardId(null);
      setRewardForm({
        type: "GOLD",
        refId: "",
        amount: 0,
        probability: 1.0,
        notes: "",
      });
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteReward = api.content.quests.rewards.deleteReward.useMutation({
    onSuccess: () => {
      toast.success("Reward deleted");
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSaveBasics = () => {
    updateQuest.mutate({
      id,
      ...basicsForm,
      recommendedMinLevel: basicsForm.recommendedMinLevel ?? null,
      occupationType: basicsForm.occupationType || null,
      prerequisiteQuestId: basicsForm.prerequisiteQuestId,
      startTriggerType: basicsForm.startTriggerType || null,
      startTriggerRefId: basicsForm.startTriggerRefId || null,
    });
  };

  const handleOpenStepDialog = (stepId?: string) => {
    if (stepId && quest) {
      const step = quest.steps.find((s) => s.id === stepId);
      if (step) {
        setStepForm({
          type: step.type as typeof stepForm.type,
          title: step.title ?? "",
          description: step.description ?? "",
          targetRefType: step.targetRefType ?? "",
          targetRefId: step.targetRefId ?? "",
          quantity: step.quantity,
          conditionsJson: step.conditionsJson as Record<string, unknown> | null,
          isOptional: step.isOptional,
        });
        setEditingStepId(stepId);
      }
    } else {
      setStepForm({
        type: "KILL_ENEMY",
        title: "",
        description: "",
        targetRefType: "",
        targetRefId: "",
        quantity: 1,
        conditionsJson: null,
        isOptional: false,
      });
      setEditingStepId(null);
    }
    setShowStepDialog(true);
  };

  const handleSaveStep = () => {
    if (!quest) return;

    if (editingStepId) {
      updateStep.mutate({
        stepId: editingStepId,
        step: stepForm,
      });
    } else {
      addStep.mutate({
        questId: id,
        step: stepForm,
      });
    }
  };

  const handleOpenRewardDialog = (rewardId?: string) => {
    if (rewardId && quest) {
      const reward = quest.rewards.find((r) => r.id === rewardId);
      if (reward) {
        setRewardForm({
          type: reward.type as typeof rewardForm.type,
          refId: reward.refId ?? "",
          amount: reward.amount,
          probability: reward.probability,
          notes: reward.notes ?? "",
        });
        setEditingRewardId(rewardId);
      }
    } else {
      setRewardForm({
        type: "GOLD",
        refId: "",
        amount: 0,
        probability: 1.0,
        notes: "",
      });
      setEditingRewardId(null);
    }
    setShowRewardDialog(true);
  };

  const handleSaveReward = () => {
    if (!quest) return;

    if (editingRewardId) {
      updateReward.mutate({
        rewardId: editingRewardId,
        reward: rewardForm,
      });
    } else {
      addReward.mutate({
        questId: id,
        reward: rewardForm,
      });
    }
  };

  const handleMoveStep = (stepId: string, direction: "up" | "down") => {
    if (!quest) return;

    const steps = [...quest.steps];
    const index = steps.findIndex((s) => s.id === stepId);
    if (index === -1) return;

    if (direction === "up" && index > 0) {
      [steps[index], steps[index - 1]] = [steps[index - 1], steps[index]];
    } else if (direction === "down" && index < steps.length - 1) {
      [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
    } else {
      return;
    }

    reorderSteps.mutate({
      questId: id,
      orderedStepIds: steps.map((s) => s.id),
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Loading quest...</p>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Quest not found</p>
        <Link href="/content/quests" className="mt-4 inline-block text-cyan-400 hover:text-cyan-300">
          Back to Quests
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "basics", label: "Basics" },
    { id: "steps", label: "Steps" },
    { id: "rewards", label: "Rewards" },
    { id: "preview", label: "Preview" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">{quest.name}</h2>
          <p className="text-sm text-slate-400">
            Slug: <span className="font-mono">{quest.slug}</span>
          </p>
        </div>
        <Link
          href="/content/quests"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Quests
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-b-2 border-cyan-400 text-cyan-400"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        {activeTab === "basics" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={basicsForm.name}
                onChange={(e) => {
                  setBasicsForm((prev) => ({ ...prev, name: e.target.value }));
                  setHasChanges(true);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Slug</label>
              <input
                type="text"
                value={basicsForm.slug}
                onChange={(e) => {
                  setBasicsForm((prev) => ({ ...prev, slug: e.target.value }));
                  setHasChanges(true);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea
                value={basicsForm.description}
                onChange={(e) => {
                  setBasicsForm((prev) => ({ ...prev, description: e.target.value }));
                  setHasChanges(true);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                <select
                  value={basicsForm.status}
                  onChange={(e) => {
                    setBasicsForm((prev) => ({ ...prev, status: e.target.value as typeof basicsForm.status }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                >
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
                  value={basicsForm.repeatability}
                  onChange={(e) => {
                    setBasicsForm((prev) => ({
                      ...prev,
                      repeatability: e.target.value as typeof basicsForm.repeatability,
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                >
                  <option value="ONCE">Once</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="REPEATABLE">Repeatable</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Recommended Min Level</label>
                <input
                  type="number"
                  value={basicsForm.recommendedMinLevel ?? ""}
                  onChange={(e) => {
                    setBasicsForm((prev) => ({
                      ...prev,
                      recommendedMinLevel: e.target.value ? parseInt(e.target.value) : null,
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Occupation Type</label>
                <input
                  type="text"
                  value={basicsForm.occupationType}
                  onChange={(e) => {
                    setBasicsForm((prev) => ({ ...prev, occupationType: e.target.value }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
            </div>

            <button
              onClick={handleSaveBasics}
              disabled={!hasChanges || updateQuest.isPending}
              className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateQuest.isPending ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
            </button>
          </div>
        )}

        {activeTab === "steps" && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="text-lg font-semibold text-cyan-400">Quest Steps</h3>
              <button
                onClick={() => handleOpenStepDialog()}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
              >
                Add Step
              </button>
            </div>

            {quest.steps.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
                <p className="text-slate-400">No steps defined</p>
                <button
                  onClick={() => handleOpenStepDialog()}
                  className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                >
                  Add First Step
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {quest.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-400">#{step.ordering}</span>
                        <span className="text-sm font-medium text-cyan-400">
                          {formatQuestStepSummary(step)}
                        </span>
                        {step.isOptional && (
                          <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                            Optional
                          </span>
                        )}
                      </div>
                      {step.description && (
                        <p className="mt-1 text-sm text-slate-400">{step.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMoveStep(step.id, "up")}
                        disabled={index === 0}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveStep(step.id, "down")}
                        disabled={index === quest.steps.length - 1}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleOpenStepDialog(step.id)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-300 transition hover:bg-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteStep.mutate({ stepId: step.id })}
                        className="rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "rewards" && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="text-lg font-semibold text-cyan-400">Quest Rewards</h3>
              <button
                onClick={() => handleOpenRewardDialog()}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
              >
                Add Reward
              </button>
            </div>

            {quest.rewards.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
                <p className="text-slate-400">No rewards defined</p>
                <button
                  onClick={() => handleOpenRewardDialog()}
                  className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                >
                  Add First Reward
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {quest.rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4"
                  >
                    <div>
                      <div className="font-medium text-cyan-400">
                        {getQuestRewardTypeLabel(reward.type)}: {reward.amount}
                        {reward.refId && ` (${reward.refId})`}
                      </div>
                      {reward.notes && <p className="mt-1 text-sm text-slate-400">{reward.notes}</p>}
                      {reward.probability < 1.0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          Probability: {(reward.probability * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenRewardDialog(reward.id)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-300 transition hover:bg-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteReward.mutate({ rewardId: reward.id })}
                        className="rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "preview" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">Quest Overview</h3>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-slate-300">{quest.description || "No description"}</p>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Status:</span>{" "}
                    <span className="text-slate-300">{quest.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Repeatability:</span>{" "}
                    <span className="text-slate-300">{getQuestRepeatabilityLabel(quest.repeatability)}</span>
                  </div>
                  {quest.recommendedMinLevel && (
                    <div>
                      <span className="text-slate-400">Min Level:</span>{" "}
                      <span className="text-slate-300">{quest.recommendedMinLevel}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">Steps</h3>
              <div className="space-y-2">
                {quest.steps.length === 0 ? (
                  <p className="text-slate-400">No steps defined</p>
                ) : (
                  quest.steps.map((step, index) => (
                    <div key={step.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                      <div className="font-medium text-cyan-400">
                        Step {index + 1}: {formatQuestStepSummary(step)}
                      </div>
                      {step.description && (
                        <p className="mt-1 text-sm text-slate-400">{step.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">Rewards</h3>
              <div className="space-y-2">
                {quest.rewards.length === 0 ? (
                  <p className="text-slate-400">No rewards defined</p>
                ) : (
                  quest.rewards.map((reward) => (
                    <div key={reward.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                      <div className="font-medium text-cyan-400">
                        {getQuestRewardTypeLabel(reward.type)}: {reward.amount}
                        {reward.refId && ` (${reward.refId})`}
                      </div>
                      {reward.notes && <p className="mt-1 text-sm text-slate-400">{reward.notes}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-400">Audit History</h3>
            <p className="text-slate-400">
              TODO: Display AuditEvent records for this quest. Query AuditEvent table filtered by
              targetEntityType="QuestTemplate" and targetEntityId="{quest.id}".
            </p>
          </div>
        )}
      </div>

      {/* Step Dialog */}
      {showStepDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowStepDialog(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">
              {editingStepId ? "Edit Step" : "Add Step"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                <select
                  value={stepForm.type}
                  onChange={(e) =>
                    setStepForm((prev) => ({
                      ...prev,
                      type: e.target.value as typeof stepForm.type,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                >
                  <option value="KILL_ENEMY">Kill Enemy</option>
                  <option value="GATHER_ITEM">Gather Item</option>
                  <option value="CRAFT_ITEM">Craft Item</option>
                  <option value="VISIT_LOCATION">Visit Location</option>
                  <option value="DELIVER_ITEM">Deliver Item</option>
                  <option value="TALK_TO_NPC">Talk to NPC</option>
                  <option value="INTERACT_NODE">Interact with Node</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title (Optional)</label>
                <input
                  type="text"
                  value={stepForm.title}
                  onChange={(e) => setStepForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={stepForm.description}
                  onChange={(e) => setStepForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Target Reference ID</label>
                <input
                  type="text"
                  value={stepForm.targetRefId}
                  onChange={(e) => setStepForm((prev) => ({ ...prev, targetRefId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  placeholder="EnemyTemplate ID, Item ID, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
                <input
                  type="number"
                  value={stepForm.quantity}
                  onChange={(e) =>
                    setStepForm((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
                  }
                  min={1}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={stepForm.isOptional}
                    onChange={(e) => setStepForm((prev) => ({ ...prev, isOptional: e.target.checked }))}
                    className="rounded border-slate-700"
                  />
                  <span className="text-sm text-slate-300">Optional Step</span>
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowStepDialog(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStep}
                  disabled={addStep.isPending || updateStep.isPending}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reward Dialog */}
      {showRewardDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRewardDialog(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">
              {editingRewardId ? "Edit Reward" : "Add Reward"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                <select
                  value={rewardForm.type}
                  onChange={(e) =>
                    setRewardForm((prev) => ({
                      ...prev,
                      type: e.target.value as typeof rewardForm.type,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                >
                  <option value="XP_CHARACTER">Character XP</option>
                  <option value="XP_OCCUPATION">Occupation XP</option>
                  <option value="ITEM">Item</option>
                  <option value="GOLD">Gold</option>
                  <option value="RECIPE_UNLOCK">Recipe Unlock</option>
                  <option value="SKILL_UNLOCK">Skill Unlock</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Reference ID (Optional)</label>
                <input
                  type="text"
                  value={rewardForm.refId}
                  onChange={(e) => setRewardForm((prev) => ({ ...prev, refId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  placeholder="Item ID, Recipe ID, Skill ID, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Amount</label>
                <input
                  type="number"
                  value={rewardForm.amount}
                  onChange={(e) =>
                    setRewardForm((prev) => ({ ...prev, amount: parseInt(e.target.value) || 0 }))
                  }
                  min={0}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Probability (0.0 - 1.0)</label>
                <input
                  type="number"
                  value={rewardForm.probability}
                  onChange={(e) =>
                    setRewardForm((prev) => ({ ...prev, probability: parseFloat(e.target.value) || 1.0 }))
                  }
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notes (Optional)</label>
                <textarea
                  value={rewardForm.notes}
                  onChange={(e) => setRewardForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRewardDialog(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReward}
                  disabled={addReward.isPending || updateReward.isPending}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => archiveQuest.mutate({ id })}
          disabled={quest.status === "ARCHIVED"}
          className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:opacity-50"
        >
          Archive
        </button>
        <button
          onClick={() => cloneQuest.mutate({ id, newName: `${quest.name} (Copy)` })}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Clone
        </button>
      </div>
    </div>
  );
}
