"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: item, isLoading } = api.content.items.get.useQuery({ id });
  const utils = api.useUtils();

  const updateItem = api.content.items.update.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      void utils.content.items.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const archiveItem = api.content.items.archive.useMutation({
    onSuccess: () => {
      toast.success("Item archived");
      void utils.content.items.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unarchiveItem = api.content.items.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Item unarchived");
      void utils.content.items.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteItem = api.content.items.delete.useMutation({
    onSuccess: () => {
      toast.success("Item deleted");
      router.push("/content/items");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Loading item...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Item not found</p>
        <Link
          href="/content/items"
          className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
        >
          Back to Items
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">{item.name}</h2>
          <p className="text-sm text-slate-400">ID: {item.id}</p>
        </div>
        <Link
          href="/content/items"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Items
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">
            Item Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Name
              </label>
              <input
                type="text"
                defaultValue={item.name}
                onBlur={(e) =>
                  updateItem.mutate({ id, name: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Description
              </label>
              <textarea
                defaultValue={item.description || ""}
                onBlur={(e) =>
                  updateItem.mutate({ id, description: e.target.value || null })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Rarity
              </label>
              <select
                defaultValue={item.rarity}
                onChange={(e) =>
                  updateItem.mutate({
                    id,
                    rarity: e.target.value as typeof item.rarity,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              >
                <option value="COMMON">COMMON</option>
                <option value="UNCOMMON">UNCOMMON</option>
                <option value="RARE">RARE</option>
                <option value="EPIC">EPIC</option>
                <option value="LEGENDARY">LEGENDARY</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Value
              </label>
              <input
                type="number"
                defaultValue={item.value}
                onBlur={(e) =>
                  updateItem.mutate({
                    id,
                    value: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Actions</h3>
            <div className="space-y-3">
              {item.isArchived ? (
                <button
                  onClick={() => unarchiveItem.mutate({ id })}
                  disabled={unarchiveItem.isPending}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  Unarchive Item
                </button>
              ) : (
                <button
                  onClick={() => archiveItem.mutate({ id })}
                  disabled={archiveItem.isPending}
                  className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:opacity-50"
                >
                  Archive Item
                </button>
              )}
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure you want to permanently delete this item? This action cannot be undone."
                    )
                  ) {
                    deleteItem.mutate({ id });
                  }
                }}
                disabled={deleteItem.isPending}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                Delete Item
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Created:</span>{" "}
                <span className="text-slate-300">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Updated:</span>{" "}
                <span className="text-slate-300">
                  {new Date(item.updatedAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>{" "}
                <span
                  className={
                    item.isArchived ? "text-red-400" : "text-green-400"
                  }
                >
                  {item.isArchived ? "Archived" : "Active"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
