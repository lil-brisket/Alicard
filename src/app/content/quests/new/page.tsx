"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function NewQuestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    coinsReward: 0,
    damageValue: 0,
    stepsJSON: "[]",
    rewardsJSON: "",
  });

  const createQuest = api.content.quests.create.useMutation({
    onSuccess: (quest) => {
      toast.success("Quest created");
      router.push(`/content/quests/${quest.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const steps = JSON.parse(formData.stepsJSON);
      const rewards = formData.rewardsJSON
        ? JSON.parse(formData.rewardsJSON)
        : undefined;

      createQuest.mutate({
        title: formData.title,
        description: formData.description || undefined,
        stepsJSON: steps,
        rewardsJSON: rewards,
        coinsReward: formData.coinsReward,
        damageValue: formData.damageValue,
      });
    } catch (error) {
      toast.error("Invalid JSON format");
    }
  };

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-cyan-400">
        Create New Quest
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Coins Reward
            </label>
            <input
              type="number"
              min={0}
              value={formData.coinsReward}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  coinsReward: parseInt(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Coins rewarded for completing this quest
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">
              Damage Value
            </label>
            <input
              type="number"
              min={0}
              value={formData.damageValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  damageValue: parseInt(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Damage dealt by quest-related actions (if applicable)
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Steps (JSON) *
          </label>
          <textarea
            required
            value={formData.stepsJSON}
            onChange={(e) =>
              setFormData({ ...formData, stepsJSON: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100"
            rows={6}
            placeholder='[{"type": "kill", "target": "goblin", "count": 5}]'
          />
          <p className="mt-1 text-xs text-slate-400">
            JSON array of quest steps
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Rewards (JSON - Optional)
          </label>
          <textarea
            value={formData.rewardsJSON}
            onChange={(e) =>
              setFormData({ ...formData, rewardsJSON: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100"
            rows={4}
            placeholder='{"items": [{"id": "item1", "quantity": 1}]}'
          />
          <p className="mt-1 text-xs text-slate-400">
            JSON object with additional rewards (optional)
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createQuest.isPending}
            className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
          >
            {createQuest.isPending ? "Creating..." : "Create Quest"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg bg-slate-700 px-6 py-2 font-medium text-slate-300 transition hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
