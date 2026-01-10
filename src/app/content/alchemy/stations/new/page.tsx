"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function NewStationPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    key: "",
    name: "",
    description: "",
    tags: [] as string[],
    stationType: "ALCHEMY",
    unlockLevel: 1,
    isEnabled: true,
    status: "DRAFT" as "DRAFT" | "ACTIVE" | "DISABLED" | "PUBLISHED" | "ARCHIVED",
  });

  const [newTag, setNewTag] = useState("");

  const createStation = api.content.stations.create.useMutation({
    onSuccess: (station) => {
      toast.success("Station created");
      router.push(`/content/alchemy/stations/${station.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create station");
    },
  });

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.key || !formData.name) {
      toast.error("Key and name are required");
      return;
    }

    createStation.mutate({
      key: formData.key,
      name: formData.name,
      description: formData.description || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      stationType: formData.stationType,
      unlockLevel: formData.unlockLevel,
      isEnabled: formData.isEnabled,
      status: formData.status,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-cyan-400">Create Alchemy Station</h1>
        <Link
          href="/content/alchemy"
          className="text-sm text-slate-400 hover:text-slate-300"
        >
          ← Back to Alchemy
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Key <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
              placeholder="mortar-pestle"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
              required
            />
            <p className="mt-1 text-xs text-slate-500">Lowercase alphanumeric with dashes/underscores</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Mortar & Pestle"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-300">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Basic alchemical grinding equipment for beginners."
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Station Type <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.stationType}
              onChange={(e) => setFormData({ ...formData, stationType: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
              required
            >
              <option value="ALCHEMY">Alchemy</option>
              <option value="BLACKSMITH">Blacksmith</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Unlock Level <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.unlockLevel}
              onChange={(e) => setFormData({ ...formData, unlockLevel: parseInt(e.target.value) || 1 })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isEnabled"
              checked={formData.isEnabled}
              onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-600 focus:ring-cyan-500"
            />
            <label htmlFor="isEnabled" className="text-sm font-medium text-slate-300">
              Enabled
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-300">Tags</label>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-sm text-slate-300"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={createStation.isPending}
            className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
          >
            {createStation.isPending ? "Creating..." : "Create Station"}
          </button>
          <Link
            href="/content/alchemy"
            className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
