"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function NewQuestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
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
    createQuest.mutate({
      name: formData.name,
      slug: formData.slug || undefined, // Auto-generated if not provided
      description: formData.description || null,
      status: formData.status,
      repeatability: formData.repeatability,
      recommendedMinLevel: formData.recommendedMinLevel,
      occupationType: formData.occupationType || null,
      prerequisiteQuestId: formData.prerequisiteQuestId,
      startTriggerType: formData.startTriggerType || null,
      startTriggerRefId: formData.startTriggerRefId || null,
    });
  };

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-cyan-400">Create New Quest</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Slug (Optional)</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-slate-100"
            placeholder="Auto-generated from name if not provided"
          />
          <p className="mt-1 text-xs text-slate-400">
            URL-friendly identifier (lower-kebab-case). Auto-generated from name if not provided.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as typeof formData.status,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Repeatability</label>
            <select
              value={formData.repeatability}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  repeatability: e.target.value as typeof formData.repeatability,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
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
            <label className="block text-sm font-medium text-slate-300">Recommended Min Level</label>
            <input
              type="number"
              min={1}
              value={formData.recommendedMinLevel ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recommendedMinLevel: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Occupation Type</label>
            <input
              type="text"
              value={formData.occupationType}
              onChange={(e) => setFormData({ ...formData, occupationType: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              placeholder="e.g., BLACKSMITH, MINER"
            />
          </div>
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
