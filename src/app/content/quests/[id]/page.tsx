"use client";

import { use } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function QuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: quest, isLoading } = api.content.quests.get.useQuery({ id });
  const utils = api.useUtils();

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">
            Quest Details
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-400">Description:</span>{" "}
              <span className="text-slate-300">{quest.description || "N/A"}</span>
            </div>
            <div className="mt-4">
              <span className="text-slate-400">Steps (JSON):</span>
              <pre className="mt-2 rounded bg-slate-800 p-2 text-xs">
                {JSON.stringify(quest.stepsJSON, null, 2)}
              </pre>
            </div>
            {quest.rewardsJSON && (
              <div className="mt-4">
                <span className="text-slate-400">Rewards (JSON):</span>
                <pre className="mt-2 rounded bg-slate-800 p-2 text-xs">
                  {JSON.stringify(quest.rewardsJSON, null, 2)}
                </pre>
              </div>
            )}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
