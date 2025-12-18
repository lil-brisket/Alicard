"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { ItemPreviewPanel } from "./_components/preview-panel";
import { PermissionIndicator } from "./_components/permission-indicator";

interface ItemStats {
  vitality?: number;
  strength?: number;
  speed?: number;
  dexterity?: number;
  hp?: number;
  sp?: number;
  defense?: number;
}

interface FormState {
  name: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "DISABLED";
  itemType: string;
  equipmentSlot: string;
  rarity: string;
  value: number;
  stats: ItemStats;
}

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: item, isLoading } = api.content.items.get.useQuery({ id });
  const { data: references } = api.content.items.getReferences.useQuery({ id });
  const utils = api.useUtils();

  const [affectsExisting, setAffectsExisting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    status: "DRAFT",
    itemType: "",
    equipmentSlot: "",
    rarity: "COMMON",
    value: 0,
    stats: {},
  });
  
  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        description: item.description ?? "",
        status: (item as any).status ?? "DRAFT",
        itemType: (item as any).itemType ?? "",
        equipmentSlot: (item as any).equipmentSlot ?? "",
        rarity: item.rarity,
        value: item.value,
        stats: (item.statsJSON as ItemStats) ?? {},
      });
      setHasChanges(false);
    }
  }, [item]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };
  
  const updateItem = api.content.items.update.useMutation({
    onSuccess: () => {
      toast.success("Item saved");
      setHasChanges(false);
      void utils.content.items.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    const cleanedStats = Object.fromEntries(
      Object.entries(form.stats).filter(([, v]) => v !== undefined && v !== 0)
    );
    updateItem.mutate({
      id,
      name: form.name,
      description: form.description || null,
      status: form.status,
      itemType: (form.itemType || undefined) as any,
      equipmentSlot: (form.equipmentSlot || undefined) as any,
      rarity: form.rarity as any,
      value: form.value,
      statsJSON: Object.keys(cleanedStats).length > 0 ? cleanedStats : undefined,
      affectsExisting,
    });
  };
  
  const cloneItem = api.content.items.clone.useMutation({
    onSuccess: (cloned) => {
      toast.success("Item cloned");
      router.push(`/content/items/${cloned.id}`);
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

  const syncItem = api.content.items.syncItem.useMutation({
    onSuccess: (result) => {
      if (result.synced) {
        toast.success("Item synced to all players");
      } else {
        toast.error(result.message);
      }
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

      <PermissionIndicator />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
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
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Status
              </label>
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
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Item Type
              </label>
              <select
                value={form.itemType}
                onChange={(e) => updateField("itemType", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              >
                <option value="">None</option>
                <option value="WEAPON">WEAPON</option>
                <option value="ARMOR">ARMOR</option>
                <option value="ACCESSORY">ACCESSORY</option>
                <option value="CONSUMABLE">CONSUMABLE</option>
                <option value="MATERIAL">MATERIAL</option>
                <option value="QUEST_ITEM">QUEST_ITEM</option>
                <option value="TOOL">TOOL</option>
                <option value="EQUIPMENT">EQUIPMENT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Equipment Slot
              </label>
              <select
                value={form.equipmentSlot}
                onChange={(e) => updateField("equipmentSlot", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              >
                <option value="">None</option>
                <option value="HEAD">HEAD</option>
                <option value="ARMS">ARMS</option>
                <option value="BODY">BODY</option>
                <option value="LEGS">LEGS</option>
                <option value="FEET">FEET</option>
                <option value="RING">RING</option>
                <option value="NECKLACE">NECKLACE</option>
                <option value="BELT">BELT</option>
                <option value="CLOAK">CLOAK</option>
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Required for equippable items (weapons, armor, accessories)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Rarity
              </label>
              <select
                value={form.rarity}
                onChange={(e) => updateField("rarity", e.target.value)}
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={affectsExisting}
                  onChange={(e) => setAffectsExisting(e.target.checked)}
                  className="rounded border-slate-700"
                />
                <span className="text-sm text-slate-300">
                  Affects existing items (versioning)
                </span>
              </label>
              <p className="mt-1 text-xs text-slate-400">
                If unchecked, only newly generated items will use new stats
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Value
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => updateField("value", parseInt(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>

            {/* Item Stats Section */}
            <div className="border-t border-slate-700 pt-4">
              <h4 className="mb-3 text-sm font-semibold text-cyan-400">Item Stats</h4>
              <p className="mb-3 text-xs text-slate-400">
                Stats bonuses applied when this item is equipped
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(["vitality", "strength", "speed", "dexterity", "hp", "sp", "defense"] as const).map((stat) => (
                  <div key={stat}>
                    <label className="block text-xs font-medium text-slate-400 capitalize">
                      {stat}
                    </label>
                    <input
                      type="number"
                      value={form.stats[stat] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                        updateField("stats", { ...form.stats, [stat]: value });
                      }}
                      placeholder="0"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="border-t border-slate-700 pt-4">
              <button
                onClick={handleSave}
                disabled={!hasChanges || updateItem.isPending}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateItem.isPending ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <ItemPreviewPanel item={item} />
          
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => syncItem.mutate({ id })}
                disabled={syncItem.isPending}
                className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {syncItem.isPending ? "Syncing..." : "Sync to Players"}
              </button>
              <p className="text-xs text-slate-400 -mt-2">
                Updates existing items in player inventories with current stats
              </p>
              <button
                onClick={() => {
                  const name = prompt("Enter name for cloned item:", `${item.name} (Copy)`);
                  if (name) {
                    cloneItem.mutate({ id, name });
                  }
                }}
                disabled={cloneItem.isPending}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                Clone Item
              </button>
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
                    (item as any).status === "DISABLED" || item.isArchived
                      ? "text-red-400"
                      : (item as any).status === "ACTIVE"
                        ? "text-green-400"
                        : "text-yellow-400"
                  }
                >
                  {(item as any).status ?? (item.isArchived ? "Archived" : "Active")}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Version:</span>{" "}
                <span className="text-slate-300">
                  {(item as any).version ?? 1}
                </span>
              </div>
              {(item as any).tags && (
                <div>
                  <span className="text-slate-400">Tags:</span>{" "}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {((item as any).tags as string[] | null)?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {references && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-cyan-400">
                Cross-References
              </h3>
              
              {references.warnings.length > 0 && (
                <div className="mb-4 space-y-2">
                  {references.warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg bg-yellow-500/20 border border-yellow-500/50 px-3 py-2 text-sm text-yellow-400"
                    >
                      ⚠️ {warning.message}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 text-sm">
                {references.recipesAsInput.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium text-slate-300">
                      Used in Recipes ({references.recipesAsInput.length})
                    </h4>
                    <div className="space-y-1">
                      {references.recipesAsInput.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="flex items-center justify-between rounded bg-slate-800/50 px-2 py-1"
                        >
                          <span className="text-slate-300">{recipe.name}</span>
                          <span
                            className={`text-xs ${
                              recipe.status === "ACTIVE"
                                ? "text-green-400"
                                : recipe.status === "DISABLED"
                                  ? "text-red-400"
                                  : "text-yellow-400"
                            }`}
                          >
                            {recipe.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {references.recipesAsOutput.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium text-slate-300">
                      Crafted by Recipes ({references.recipesAsOutput.length})
                    </h4>
                    <div className="space-y-1">
                      {references.recipesAsOutput.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="flex items-center justify-between rounded bg-slate-800/50 px-2 py-1"
                        >
                          <span className="text-slate-300">{recipe.name}</span>
                          <span
                            className={`text-xs ${
                              recipe.status === "ACTIVE"
                                ? "text-green-400"
                                : recipe.status === "DISABLED"
                                  ? "text-red-400"
                                  : "text-yellow-400"
                            }`}
                          >
                            {recipe.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {references.nodes.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium text-slate-300">
                      Gathered from Nodes ({references.nodes.length})
                    </h4>
                    <div className="space-y-1">
                      {references.nodes.map((node) => (
                        <div
                          key={node.id}
                          className="flex items-center justify-between rounded bg-slate-800/50 px-2 py-1"
                        >
                          <span className="text-slate-300">{node.name}</span>
                          <span
                            className={`text-xs ${
                              node.status === "ACTIVE"
                                ? "text-green-400"
                                : node.status === "DISABLED"
                                  ? "text-red-400"
                                  : "text-yellow-400"
                            }`}
                          >
                            {node.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {references.shopItems.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium text-slate-300">
                      Sold by NPCs ({references.shopItems.length})
                    </h4>
                    <div className="space-y-1">
                      {references.shopItems.map((shopItem) => (
                        <div
                          key={shopItem.id}
                          className="rounded bg-slate-800/50 px-2 py-1 text-slate-300"
                        >
                          {shopItem.npc.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {references.recipesAsInput.length === 0 &&
                  references.recipesAsOutput.length === 0 &&
                  references.nodes.length === 0 &&
                  references.shopItems.length === 0 && (
                    <p className="text-slate-400">
                      No cross-references found for this item.
                    </p>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
