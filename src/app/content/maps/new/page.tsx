"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function NewMapPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    width: 10,
    height: 10,
    coinsReward: 0,
    damageModifier: 0,
    tilesJSON: "{}",
    poisJSON: "",
    spawnJSON: "",
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
    try {
      const tiles = JSON.parse(formData.tilesJSON);
      const pois = formData.poisJSON
        ? JSON.parse(formData.poisJSON)
        : undefined;
      const spawns = formData.spawnJSON
        ? JSON.parse(formData.spawnJSON)
        : undefined;

      createMap.mutate({
        name: formData.name,
        width: formData.width,
        height: formData.height,
        tilesJSON: tiles,
        poisJSON: pois,
        spawnJSON: spawns,
        coinsReward: formData.coinsReward,
        damageModifier: formData.damageModifier,
      });
    } catch (error) {
      toast.error("Invalid JSON format");
    }
  };

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-cyan-400">
        Create New Map
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
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
              Width *
            </label>
            <input
              type="number"
              required
              min={1}
              value={formData.width}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  width: parseInt(e.target.value) || 1,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">
              Height *
            </label>
            <input
              type="number"
              required
              min={1}
              value={formData.height}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  height: parseInt(e.target.value) || 1,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>
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
              Base coins available in this map zone
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">
              Damage Modifier
            </label>
            <input
              type="number"
              value={formData.damageModifier}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  damageModifier: parseInt(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Damage modifier for this map (environmental hazards, etc.)
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Tiles (JSON) *
          </label>
          <textarea
            required
            value={formData.tilesJSON}
            onChange={(e) =>
              setFormData({ ...formData, tilesJSON: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100"
            rows={6}
            placeholder='{"0,0": {"type": "GRASS", "zone": "SAFE"}}'
          />
          <p className="mt-1 text-xs text-slate-400">
            JSON object with tile data structure
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Points of Interest (JSON - Optional)
          </label>
          <textarea
            value={formData.poisJSON}
            onChange={(e) =>
              setFormData({ ...formData, poisJSON: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100"
            rows={4}
            placeholder='[{"x": 5, "y": 5, "type": "town"}]'
          />
          <p className="mt-1 text-xs text-slate-400">
            JSON array of points of interest (optional)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Spawn Data (JSON - Optional)
          </label>
          <textarea
            value={formData.spawnJSON}
            onChange={(e) =>
              setFormData({ ...formData, spawnJSON: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100"
            rows={4}
            placeholder='{"monsters": [{"type": "goblin", "chance": 0.5}]}'
          />
          <p className="mt-1 text-xs text-slate-400">
            JSON object with spawn data (optional)
          </p>
        </div>

        <div className="flex gap-4">
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
