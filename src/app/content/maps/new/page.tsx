"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function NewMapPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    biome: "",
    recommendedMinLevel: "",
    recommendedMaxLevel: "",
    dangerRating: "1",
  });

  const createMap = api.content.maps.create.useMutation({
    onSuccess: (map) => {
      toast.success("Map created");
      router.push(`/content/maps/${map.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMap.mutate({
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
      description: formData.description || undefined,
      biome: formData.biome || undefined,
      recommendedMinLevel: formData.recommendedMinLevel ? parseInt(formData.recommendedMinLevel) : undefined,
      recommendedMaxLevel: formData.recommendedMaxLevel ? parseInt(formData.recommendedMaxLevel) : undefined,
      dangerRating: parseInt(formData.dangerRating) || 1,
    });
  };

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-cyan-400">
        Create New Map Definition
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Slug *
          </label>
          <input
            type="text"
            required
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="auto-generated from name if empty"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 font-mono"
          />
          <p className="mt-1 text-xs text-slate-400">
            Unique identifier (lowercase, hyphens only)
          </p>
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

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Biome
          </label>
          <input
            type="text"
            value={formData.biome}
            onChange={(e) =>
              setFormData({ ...formData, biome: e.target.value })
            }
            placeholder="e.g. Plains, Forest, Desert"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Min Level
            </label>
            <input
              type="number"
              min={1}
              value={formData.recommendedMinLevel}
              onChange={(e) =>
                setFormData({ ...formData, recommendedMinLevel: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">
              Max Level
            </label>
            <input
              type="number"
              min={1}
              value={formData.recommendedMaxLevel}
              onChange={(e) =>
                setFormData({ ...formData, recommendedMaxLevel: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">
              Danger Rating
            </label>
            <input
              type="number"
              min={1}
              value={formData.dangerRating}
              onChange={(e) =>
                setFormData({ ...formData, dangerRating: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={createMap.isPending}
            className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
          >
            {createMap.isPending ? "Creating..." : "Create Map"}
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
