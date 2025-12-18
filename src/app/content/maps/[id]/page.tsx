"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

interface FormState {
  name: string;
  status: "DRAFT" | "ACTIVE" | "DISABLED";
  width: number;
  height: number;
  tilesJSON: string;
  poisJSON: string;
  spawnJSON: string;
}

export default function MapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: map, isLoading } = api.content.maps.get.useQuery({ id });
  const utils = api.useUtils();

  const [hasChanges, setHasChanges] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    status: "DRAFT",
    width: 10,
    height: 10,
    tilesJSON: "[]",
    poisJSON: "[]",
    spawnJSON: "{}",
  });

  useEffect(() => {
    if (map) {
      setForm({
        name: map.name,
        status: map.status,
        width: map.width,
        height: map.height,
        tilesJSON: JSON.stringify(map.tilesJSON, null, 2),
        poisJSON: map.poisJSON ? JSON.stringify(map.poisJSON, null, 2) : "[]",
        spawnJSON: map.spawnJSON ? JSON.stringify(map.spawnJSON, null, 2) : "{}",
      });
      setHasChanges(false);
    }
  }, [map]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateMap = api.content.maps.update.useMutation({
    onSuccess: () => {
      toast.success("Map saved");
      setHasChanges(false);
      void utils.content.maps.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    try {
      const tilesJSON = JSON.parse(form.tilesJSON);
      const poisJSON = form.poisJSON.trim() ? JSON.parse(form.poisJSON) : null;
      const spawnJSON = form.spawnJSON.trim() ? JSON.parse(form.spawnJSON) : null;
      updateMap.mutate({
        id,
        name: form.name,
        width: form.width,
        height: form.height,
        tilesJSON,
        poisJSON,
        spawnJSON,
      });
    } catch {
      toast.error("Invalid JSON in tiles, POIs, or spawns");
    }
  };

  const archiveMap = api.content.maps.archive.useMutation({
    onSuccess: () => {
      toast.success("Map archived");
      void utils.content.maps.get.invalidate({ id });
    },
  });

  const unarchiveMap = api.content.maps.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Map unarchived");
      void utils.content.maps.get.invalidate({ id });
    },
  });

  const deleteMap = api.content.maps.delete.useMutation({
    onSuccess: () => {
      toast.success("Map deleted");
      router.push("/content/maps");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Loading map...</p>
      </div>
    );
  }

  if (!map) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Map not found</p>
        <Link
          href="/content/maps"
          className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
        >
          Back to Maps
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">{map.name}</h2>
          <p className="text-sm text-slate-400">ID: {map.id} | Size: {map.width} × {map.height}</p>
        </div>
        <Link
          href="/content/maps"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Maps
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">Map Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Width</label>
                <input
                  type="number"
                  min={1}
                  value={form.width}
                  onChange={(e) => updateField("width", parseInt(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Height</label>
                <input
                  type="number"
                  min={1}
                  value={form.height}
                  onChange={(e) => updateField("height", parseInt(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Tiles (JSON)</label>
              <textarea
                value={form.tilesJSON}
                onChange={(e) => updateField("tilesJSON", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-100"
                rows={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">POIs (JSON)</label>
              <textarea
                value={form.poisJSON}
                onChange={(e) => updateField("poisJSON", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-100"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Spawns (JSON)</label>
              <textarea
                value={form.spawnJSON}
                onChange={(e) => updateField("spawnJSON", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-100"
                rows={4}
              />
            </div>

            {/* Save Button */}
            <div className="border-t border-slate-700 pt-4">
              <button
                onClick={handleSave}
                disabled={!hasChanges || updateMap.isPending}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMap.isPending ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Actions</h3>
            <div className="space-y-3">
              {map.isArchived ? (
                <button
                  onClick={() => unarchiveMap.mutate({ id })}
                  disabled={unarchiveMap.isPending}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  Unarchive Map
                </button>
              ) : (
                <button
                  onClick={() => archiveMap.mutate({ id })}
                  disabled={archiveMap.isPending}
                  className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:opacity-50"
                >
                  Archive Map
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to permanently delete this map?")) {
                    deleteMap.mutate({ id });
                  }
                }}
                disabled={deleteMap.isPending}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                Delete Map
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Status:</span>{" "}
                <span className={map.status === "ACTIVE" ? "text-green-400" : map.status === "DISABLED" ? "text-red-400" : "text-yellow-400"}>
                  {map.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Version:</span>{" "}
                <span className="text-slate-300">{map.version}</span>
              </div>
              <div>
                <span className="text-slate-400">Created:</span>{" "}
                <span className="text-slate-300">{new Date(map.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400">Updated:</span>{" "}
                <span className="text-slate-300">{new Date(map.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
