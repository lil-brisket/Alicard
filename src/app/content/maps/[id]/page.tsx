"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    biome: "",
    recommendedMinLevel: "",
    recommendedMaxLevel: "",
    dangerRating: "1",
  });

  useEffect(() => {
    if (map && !hasChanges) {
      setFormData({
        name: map.name,
        description: map.description ?? "",
        biome: map.biome ?? "",
        recommendedMinLevel: map.recommendedMinLevel?.toString() ?? "",
        recommendedMaxLevel: map.recommendedMaxLevel?.toString() ?? "",
        dangerRating: map.dangerRating.toString(),
      });
    }
  }, [map, hasChanges]);

  const updateMap = api.content.maps.update.useMutation({
    onSuccess: () => {
      toast.success("Map updated");
      setHasChanges(false);
      void utils.content.maps.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createVersion = api.content.maps.createVersion.useMutation({
    onSuccess: (version) => {
      toast.success("Version created");
      router.push(`/content/maps/${id}/versions/${version.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cloneVersion = api.content.maps.cloneVersion.useMutation({
    onSuccess: () => {
      toast.success("Version cloned");
      void utils.content.maps.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const publishVersion = api.content.maps.publishVersion.useMutation({
    onSuccess: () => {
      toast.success("Version published");
      void utils.content.maps.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const archiveMap = api.content.maps.archive.useMutation({
    onSuccess: () => {
      toast.success("Map archive status updated");
      void utils.content.maps.get.invalidate({ id });
    },
  });

  const handleSave = () => {
    updateMap.mutate({
      id,
      name: formData.name,
      description: formData.description || null,
      biome: formData.biome || null,
      recommendedMinLevel: formData.recommendedMinLevel ? parseInt(formData.recommendedMinLevel) : null,
      recommendedMaxLevel: formData.recommendedMaxLevel ? parseInt(formData.recommendedMaxLevel) : null,
      dangerRating: parseInt(formData.dangerRating) || 1,
    });
  };

  const handleCreateVersion = () => {
    const width = prompt("Enter map width (5-200):", "25");
    const height = prompt("Enter map height (5-200):", "25");
    if (!width || !height) return;

    const widthNum = parseInt(width);
    const heightNum = parseInt(height);

    if (widthNum < 5 || widthNum > 200 || heightNum < 5 || heightNum > 200) {
      toast.error("Width and height must be between 5 and 200");
      return;
    }

    createVersion.mutate({
      mapId: id,
      width: widthNum,
      height: heightNum,
    });
  };

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
          <p className="text-sm text-slate-400">Slug: {map.slug}</p>
        </div>
        <Link
          href="/content/maps"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Maps
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Map Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setHasChanges(true);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    setHasChanges(true);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Biome</label>
                <input
                  type="text"
                  value={formData.biome}
                  onChange={(e) => {
                    setFormData({ ...formData, biome: e.target.value });
                    setHasChanges(true);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Min Level</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.recommendedMinLevel}
                    onChange={(e) => {
                      setFormData({ ...formData, recommendedMinLevel: e.target.value });
                      setHasChanges(true);
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300">Max Level</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.recommendedMaxLevel}
                    onChange={(e) => {
                      setFormData({ ...formData, recommendedMaxLevel: e.target.value });
                      setHasChanges(true);
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300">Danger Rating</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.dangerRating}
                    onChange={(e) => {
                      setFormData({ ...formData, dangerRating: e.target.value });
                      setHasChanges(true);
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

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

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-cyan-400">Versions</h3>
              <button
                onClick={handleCreateVersion}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
              >
                Create Version
              </button>
            </div>

            {map.versions.length === 0 ? (
              <p className="text-sm text-slate-400">No versions yet. Create one to start editing.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-400">
                        Version
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-400">
                        Size
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-400">
                        Created
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-400">
                        Published
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {map.versions.map((version) => (
                      <tr key={version.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-medium">v{version.versionNumber}</td>
                        <td className="px-4 py-2">
                          {version.status === "PUBLISHED" ? (
                            <span className="inline-flex rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                              PUBLISHED
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-400">
                              DRAFT
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-400">
                          {version.width} × {version.height}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-400">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-400">
                          {version.publishedAt ? new Date(version.publishedAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <Link
                              href={`/content/maps/${id}/versions/${version.id}`}
                              className="text-sm text-cyan-400 hover:text-cyan-300"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => cloneVersion.mutate({ versionId: version.id })}
                              className="text-sm text-purple-400 hover:text-purple-300"
                              disabled={cloneVersion.isPending}
                            >
                              Clone
                            </button>
                            {version.status === "DRAFT" && (
                              <button
                                onClick={() => {
                                  if (confirm("Publish this version? This will unpublish any other published version.")) {
                                    publishVersion.mutate({ versionId: version.id });
                                  }
                                }}
                                className="text-sm text-green-400 hover:text-green-300"
                                disabled={publishVersion.isPending}
                              >
                                Publish
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => archiveMap.mutate({ id, isArchived: !map.isArchived })}
                disabled={archiveMap.isPending}
                className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:opacity-50"
              >
                {map.isArchived ? "Unarchive Map" : "Archive Map"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Created:</span>{" "}
                <span className="text-slate-300">{new Date(map.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400">Updated:</span>{" "}
                <span className="text-slate-300">{new Date(map.updatedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400">Archived:</span>{" "}
                <span className="text-slate-300">{map.isArchived ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
