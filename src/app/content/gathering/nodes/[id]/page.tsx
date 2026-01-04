"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

interface YieldForm {
  id?: string;
  itemId: string;
  minQty: number;
  maxQty: number;
  chance?: number | null;
}

export default function GatheringNodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";
  
  const { data: node, isLoading } = api.content.gatheringNodes.get.useQuery(
    { id },
    { enabled: !isNew }
  );
  const { data: yields } = api.content.gatheringNodeYields.list.useQuery(
    { nodeId: id },
    { enabled: !isNew }
  );
  const { data: jobs } = api.jobs.listJobs.useQuery();
  const utils = api.useUtils();

  const [form, setForm] = useState({
    name: "",
    key: "",
    description: "",
    jobId: "",
    tier: 1,
    requiredJobLevel: 1,
    gatherTimeSeconds: 30,
    xpReward: 10,
    dangerTier: 1,
    cooldownSeconds: undefined as number | undefined,
    isActive: true as boolean,
  });

  const [yieldForms, setYieldForms] = useState<YieldForm[]>([]);
  const [showAddYieldModal, setShowAddYieldModal] = useState(false);
  const [newYield, setNewYield] = useState<YieldForm>({
    itemId: "",
    minQty: 1,
    maxQty: 1,
    chance: null,
  });
  const [itemTypeFilter, setItemTypeFilter] = useState<string>("MATERIAL");
  const [itemSearch, setItemSearch] = useState("");

  useEffect(() => {
    if (node) {
      setForm({
        name: node.name,
        key: node.key,
        description: node.description ?? "",
        jobId: node.jobId,
        tier: node.tier,
        requiredJobLevel: node.requiredJobLevel,
        gatherTimeSeconds: node.gatherTimeSeconds,
        xpReward: node.xpReward,
        dangerTier: node.dangerTier,
        cooldownSeconds: node.cooldownSeconds ?? undefined,
        isActive: node.isActive ?? true,
      });
    }
  }, [node]);

  useEffect(() => {
    if (yields) {
      setYieldForms(
        yields.map((y) => ({
          id: y.id,
          itemId: y.itemId,
          minQty: y.minQty,
          maxQty: y.maxQty,
          chance: y.chance ?? null,
        }))
      );
    }
  }, [yields]);

  const { data: items } = api.content.items.list.useQuery({
    type: itemTypeFilter as any,
    query: itemSearch || undefined,
    isActive: true,
    limit: 50,
  });

  const createNode = api.content.gatheringNodes.create.useMutation({
    onSuccess: (created) => {
      toast.success("Node created");
      router.push(`/content/gathering/nodes/${created.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateNode = api.content.gatheringNodes.update.useMutation({
    onSuccess: () => {
      toast.success("Node saved");
      void utils.content.gatheringNodes.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addYield = api.content.gatheringNodeYields.add.useMutation({
    onSuccess: () => {
      toast.success("Yield added");
      setShowAddYieldModal(false);
      setNewYield({ itemId: "", minQty: 1, maxQty: 1, chance: null });
      void utils.content.gatheringNodeYields.list.invalidate({ nodeId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateYield = api.content.gatheringNodeYields.update.useMutation({
    onSuccess: () => {
      toast.success("Yield updated");
      void utils.content.gatheringNodeYields.list.invalidate({ nodeId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeYield = api.content.gatheringNodeYields.remove.useMutation({
    onSuccess: () => {
      toast.success("Yield removed");
      void utils.content.gatheringNodeYields.list.invalidate({ nodeId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    if (isNew) {
      createNode.mutate({
        ...form,
        cooldownSeconds: form.cooldownSeconds ?? undefined,
      });
    } else {
      // Build update data, only including fields that should be updated
      const updateData: any = {
        name: form.name,
        description: form.description || null,
        tier: form.tier,
        requiredJobLevel: form.requiredJobLevel,
        gatherTimeSeconds: form.gatherTimeSeconds,
        xpReward: form.xpReward,
        dangerTier: form.dangerTier,
        isActive: form.isActive,
      };
      
      // Only include jobId if it's different from the current value
      if (form.jobId && form.jobId !== node?.jobId) {
        updateData.jobId = form.jobId;
      }
      
      // Only include cooldownSeconds if it's explicitly set (not undefined)
      // If it's undefined, we don't include it (Prisma will leave it unchanged)
      // If it's null or a number, we include it
      if (form.cooldownSeconds !== undefined) {
        updateData.cooldownSeconds = form.cooldownSeconds ?? null;
      }
      
      // Only include key if it's being changed
      if (form.key && form.key !== node?.key) {
        updateData.key = form.key;
      }
      
      updateNode.mutate({
        id,
        ...updateData,
      });
    }
  };

  const handleAddYield = () => {
    if (!newYield.itemId || newYield.minQty <= 0 || newYield.maxQty < newYield.minQty) {
      toast.error("Please fill in all required fields correctly");
      return;
    }
    addYield.mutate({
      nodeId: id,
      itemId: newYield.itemId,
      minQty: newYield.minQty,
      maxQty: newYield.maxQty,
      chance: newYield.chance ?? undefined,
    });
  };

  const handleUpdateYield = (yieldId: string, updates: Partial<YieldForm>) => {
    updateYield.mutate({
      id: yieldId,
      ...updates,
    });
  };

  const handleRemoveYield = (yieldId: string) => {
    if (confirm("Are you sure you want to remove this yield?")) {
      removeYield.mutate({ id: yieldId });
    }
  };

  if (isLoading && !isNew) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Loading node...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">
            {isNew ? "Create Gathering Node" : node?.name}
          </h2>
          <p className="text-sm text-slate-400">ID: {id}</p>
        </div>
        <Link
          href="/content/gathering/nodes"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Nodes
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">
            Node Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Key <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                required
                disabled={!isNew}
              />
              <p className="mt-1 text-xs text-slate-400">
                Unique identifier (cannot be changed after creation)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Job <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.jobId}
                  onChange={(e) => setForm({ ...form, jobId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  required
                >
                  <option value="">Select job...</option>
                  {jobs?.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Tier
                </label>
                <input
                  type="number"
                  value={form.tier}
                  onChange={(e) => setForm({ ...form, tier: parseInt(e.target.value) || 1 })}
                  min={1}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Required Job Level
                </label>
                <input
                  type="number"
                  value={form.requiredJobLevel}
                  onChange={(e) => setForm({ ...form, requiredJobLevel: parseInt(e.target.value) || 1 })}
                  min={1}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Gather Time (seconds)
                </label>
                <input
                  type="number"
                  value={form.gatherTimeSeconds}
                  onChange={(e) => setForm({ ...form, gatherTimeSeconds: parseInt(e.target.value) || 30 })}
                  min={1}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  XP Reward
                </label>
                <input
                  type="number"
                  value={form.xpReward}
                  onChange={(e) => setForm({ ...form, xpReward: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Danger Tier
                </label>
                <input
                  type="number"
                  value={form.dangerTier}
                  onChange={(e) => setForm({ ...form, dangerTier: parseInt(e.target.value) || 1 })}
                  min={1}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Cooldown (seconds, optional)
              </label>
              <input
                type="number"
                value={form.cooldownSeconds || ""}
                onChange={(e) => setForm({ ...form, cooldownSeconds: e.target.value ? parseInt(e.target.value) : undefined })}
                min={0}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-700"
                />
                <span className="text-sm text-slate-300">Active</span>
              </label>
            </div>
            <div className="border-t border-slate-700 pt-4">
              <button
                onClick={handleSave}
                disabled={createNode.isPending || updateNode.isPending}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {createNode.isPending || updateNode.isPending
                  ? "Saving..."
                  : isNew
                    ? "Create Node"
                    : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Yields Panel */}
          {!isNew && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-cyan-400">Yields</h3>
                <button
                  onClick={() => setShowAddYieldModal(true)}
                  className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-700"
                >
                  Add Yield
                </button>
              </div>
              {yieldForms.length > 0 ? (
                <div className="space-y-2">
                  {yieldForms.map((yieldForm) => {
                    const item = yields?.find((y) => y.id === yieldForm.id)?.item;
                    return (
                      <div
                        key={yieldForm.id}
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-200">
                              {item?.name ?? "Unknown Item"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item?.itemType}
                            </p>
                          </div>
                          <button
                            onClick={() => yieldForm.id && handleRemoveYield(yieldForm.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-slate-400">Min</label>
                            <input
                              type="number"
                              value={yieldForm.minQty}
                              onChange={(e) => {
                                const newMin = parseInt(e.target.value) || 1;
                                if (yieldForm.id) {
                                  handleUpdateYield(yieldForm.id, { minQty: newMin });
                                }
                              }}
                              min={1}
                              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400">Max</label>
                            <input
                              type="number"
                              value={yieldForm.maxQty}
                              onChange={(e) => {
                                const newMax = parseInt(e.target.value) || 1;
                                if (yieldForm.id) {
                                  handleUpdateYield(yieldForm.id, { maxQty: newMax });
                                }
                              }}
                              min={yieldForm.minQty}
                              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400">Chance</label>
                            <input
                              type="number"
                              step="0.01"
                              value={yieldForm.chance ?? ""}
                              onChange={(e) => {
                                const newChance = e.target.value === "" ? null : parseFloat(e.target.value);
                                if (yieldForm.id) {
                                  handleUpdateYield(yieldForm.id, { chance: newChance });
                                }
                              }}
                              min={0}
                              max={1}
                              placeholder="1.0"
                              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No yields configured</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Yield Modal */}
      {showAddYieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Add Yield</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Item Type Filter
                </label>
                <select
                  value={itemTypeFilter}
                  onChange={(e) => setItemTypeFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                >
                  <option value="MATERIAL">MATERIAL</option>
                  <option value="EQUIPMENT">EQUIPMENT</option>
                  <option value="CONSUMABLE">CONSUMABLE</option>
                  <option value="QUEST">QUEST</option>
                  <option value="CURRENCY">CURRENCY</option>
                  <option value="KEY">KEY</option>
                  <option value="MISC">MISC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Search Items
                </label>
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search items..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Item <span className="text-red-400">*</span>
                </label>
                <select
                  value={newYield.itemId}
                  onChange={(e) => setNewYield({ ...newYield, itemId: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  required
                >
                  <option value="">Select item...</option>
                  {items?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.itemType})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Min Qty <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={newYield.minQty}
                    onChange={(e) => setNewYield({ ...newYield, minQty: parseInt(e.target.value) || 1 })}
                    min={1}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Qty <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={newYield.maxQty}
                    onChange={(e) => setNewYield({ ...newYield, maxQty: parseInt(e.target.value) || 1 })}
                    min={newYield.minQty}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Chance (optional, 0-1)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newYield.chance ?? ""}
                  onChange={(e) => setNewYield({ ...newYield, chance: e.target.value === "" ? null : parseFloat(e.target.value) })}
                  min={0}
                  max={1}
                  placeholder="1.0"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddYield}
                  disabled={addYield.isPending}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddYieldModal(false);
                    setNewYield({ itemId: "", minQty: 1, maxQty: 1, chance: null });
                  }}
                  className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

