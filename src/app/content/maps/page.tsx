"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function ContentMapsPage() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState("");
  const { data: maps, isLoading, refetch } = api.content.maps.list.useQuery({
    includeArchived,
    search: search || undefined,
    limit: 100,
  });

  const archiveMutation = api.content.maps.archive.useMutation({
    onSuccess: () => {
      toast.success("Map archive status updated");
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cloneMutation = api.content.maps.clone.useMutation({
    onSuccess: () => {
      toast.success("Map cloned");
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleArchive = (map: { id: string; isArchived: boolean }) => {
    archiveMutation.mutate({
      id: map.id,
      isArchived: !map.isArchived,
    });
  };

  const handleClone = (map: { id: string; name: string }) => {
    cloneMutation.mutate({ id: map.id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">Map Definitions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage versioned game maps with publishable snapshots
          </p>
        </div>
        <Link
          href="/content/maps/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          Create Map
        </Link>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search maps by name or slug..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-slate-700"
          />
          <span className="text-sm text-slate-400">Include archived</span>
        </label>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">Loading maps...</p>
        </div>
      ) : maps && maps.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Biome
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Danger
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Published
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Updated
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {maps.map((map) => (
                <tr key={map.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium">{map.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-400 font-mono">
                    {map.slug}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {map.biome ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {map.dangerRating}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {map.publishedVersion ? (
                      <span className="inline-flex rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                        v{map.publishedVersion}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {new Date(map.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/content/maps/${map.id}`}
                        className="text-sm text-cyan-400 hover:text-cyan-300"
                      >
                        Open
                      </Link>
                      <button
                        onClick={() => handleClone(map)}
                        className="text-sm text-purple-400 hover:text-purple-300"
                        disabled={cloneMutation.isPending}
                      >
                        Clone
                      </button>
                      <button
                        onClick={() => handleArchive(map)}
                        className="text-sm text-yellow-400 hover:text-yellow-300"
                        disabled={archiveMutation.isPending}
                      >
                        {map.isArchived ? "Unarchive" : "Archive"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No maps found</p>
        </div>
      )}
    </div>
  );
}
