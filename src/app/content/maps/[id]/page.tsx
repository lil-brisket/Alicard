"use client";

import { use } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function MapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: map, isLoading } = api.content.maps.get.useQuery({ id });
  const utils = api.useUtils();

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
          <p className="text-sm text-slate-400">
            ID: {map.id} | Size: {map.width} × {map.height}
          </p>
        </div>
        <Link
          href="/content/maps"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Maps
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">
            Map Data
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-slate-400">Tiles (JSON):</span>
              <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-800 p-2 text-xs">
                {JSON.stringify(map.tilesJSON, null, 2)}
              </pre>
            </div>
            {map.poisJSON && (
              <div>
                <span className="text-slate-400">POIs (JSON):</span>
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-800 p-2 text-xs">
                  {JSON.stringify(map.poisJSON, null, 2)}
                </pre>
              </div>
            )}
            {map.spawnJSON && (
              <div>
                <span className="text-slate-400">Spawns (JSON):</span>
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-800 p-2 text-xs">
                  {JSON.stringify(map.spawnJSON, null, 2)}
                </pre>
              </div>
            )}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
