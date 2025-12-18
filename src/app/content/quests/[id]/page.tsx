"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

interface FormState {
  name: string;
  title: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "DISABLED";
  coinsReward: number;
  stepsJSON: string;
  rewardsJSON: string;
}

export default function QuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: quest, isLoading } = api.content.quests.get.useQuery({ id });
  const utils = api.useUtils();

  const [hasChanges, setHasChanges] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    title: "",
    description: "",
    status: "DRAFT",
    coinsReward: 0,
    stepsJSON: "[]",
    rewardsJSON: "{}",
  });

  useEffect(() => {
    if (quest) {
      setForm({
        name: quest.name,
        title: quest.title,
        description: quest.description ?? "",
        status: quest.status,
        coinsReward: quest.coinsReward ?? 0,
        stepsJSON: JSON.stringify(quest.stepsJSON, null, 2),
        rewardsJSON: quest.rewardsJSON ? JSON.stringify(quest.rewardsJSON, null, 2) : "{}",
      });
      setHasChanges(false);
    }
  }, [quest]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateQuest = api.content.quests.update.useMutation({
    onSuccess: () => {
      toast.success("Quest saved");
      setHasChanges(false);
      void utils.content.quests.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    try {
      const stepsJSON = JSON.parse(form.stepsJSON);
      const rewardsJSON = form.rewardsJSON.trim() ? JSON.parse(form.rewardsJSON) : null;
      updateQuest.mutate({
        id,
        title: form.title,
        description: form.description || null,
        stepsJSON,
        rewardsJSON,
        coinsReward: form.coinsReward,
      });
    } catch {
      toast.error("Invalid JSON in steps or rewards");
    }
  };

  const archiveQuest = api.content.quests.archive.useMutation({
    onSuccess: () => {
      toast.success("Quest archived");
      void utils.content.quests.get.invalidate({ id });
    },
  });

  const unarchiveQuest = api.content.quests.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Quest unarchived");
      void utils.content.quests.get.invalidate({ id });
    },
  });

  const deleteQuest = api.content.quests.delete.useMutation({
    onSuccess: () => {
      toast.success("Quest deleted");
      router.push("/content/quests");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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
        <Link
          href="/content/quests"
          className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
        >
          Back to Quests
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">{quest.title}</h2>
          <p className="text-sm text-slate-400">ID: {quest.id}</p>
        </div>
        <Link
          href="/content/quests"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Quests
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">Quest Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Name (Internal)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Title (Display)</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value as FormState["status"])}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Coins Reward</label>
              <input
                type="number"
                min={0}
                value={form.coinsReward}
                onChange={(e) => updateField("coinsReward", parseInt(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Steps (JSON)</label>
              <textarea
                value={form.stepsJSON}
                onChange={(e) => updateField("stepsJSON", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-100"
                rows={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Rewards (JSON)</label>
              <textarea
                value={form.rewardsJSON}
                onChange={(e) => updateField("rewardsJSON", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-100"
                rows={4}
              />
            </div>

            {/* Save Button */}
            <div className="border-t border-slate-700 pt-4">
              <button
                onClick={handleSave}
                disabled={!hasChanges || updateQuest.isPending}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateQuest.isPending ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Actions</h3>
            <div className="space-y-3">
              {quest.isArchived ? (
                <button
                  onClick={() => unarchiveQuest.mutate({ id })}
                  disabled={unarchiveQuest.isPending}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  Unarchive Quest
                </button>
              ) : (
                <button
                  onClick={() => archiveQuest.mutate({ id })}
                  disabled={archiveQuest.isPending}
                  className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:opacity-50"
                >
                  Archive Quest
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to permanently delete this quest?")) {
                    deleteQuest.mutate({ id });
                  }
                }}
                disabled={deleteQuest.isPending}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                Delete Quest
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Status:</span>{" "}
                <span className={quest.status === "ACTIVE" ? "text-green-400" : quest.status === "DISABLED" ? "text-red-400" : "text-yellow-400"}>
                  {quest.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Version:</span>{" "}
                <span className="text-slate-300">{quest.version}</span>
              </div>
              <div>
                <span className="text-slate-400">Created:</span>{" "}
                <span className="text-slate-300">{new Date(quest.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400">Updated:</span>{" "}
                <span className="text-slate-300">{new Date(quest.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
