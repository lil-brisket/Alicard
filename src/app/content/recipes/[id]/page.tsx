"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { ItemPicker } from "../_components/item-picker";

type RecipeInput = {
  itemId: string;
  qty: number;
};

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: recipe, isLoading } = api.content.recipes.get.useQuery({ id });
  const { data: jobs } = api.jobs.listJobs.useQuery();
  const utils = api.useUtils();

  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: [] as string[],
    jobId: "",
    station: "" as "" | "SMELTER" | "ANVIL" | "FORGE" | "TEMPERING_RACK",
    requiredJobLevel: 1,
    difficulty: 1,
    craftTimeSeconds: 0,
    xp: 0,
    outputItemId: "",
    outputQty: 1,
    inputs: [] as RecipeInput[],
    isActive: true,
    allowNonGatherableInputs: false,
    sourceGatherJobKey: "",
    status: "DRAFT" as "DRAFT" | "ACTIVE" | "DISABLED",
  });

  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        description: recipe.description ?? "",
        tags: (recipe.tags as string[] | null) ?? [],
        jobId: recipe.jobId,
        station: (recipe.station as typeof formData.station) ?? "",
        requiredJobLevel: recipe.requiredJobLevel,
        difficulty: recipe.difficulty,
        craftTimeSeconds: recipe.craftTimeSeconds ?? 0,
        xp: recipe.xp ?? 0,
        outputItemId: recipe.outputItemId,
        outputQty: recipe.outputQty,
        inputs: recipe.inputs.map((inp) => ({
          itemId: inp.itemId,
          qty: inp.qty,
        })),
        isActive: recipe.isActive,
        allowNonGatherableInputs: recipe.allowNonGatherableInputs,
        sourceGatherJobKey: recipe.sourceGatherJobKey ?? "",
        status: (recipe.status as typeof formData.status) ?? "DRAFT",
      });
      setHasChanges(false);
    }
  }, [recipe]);

  const updateField = <K extends keyof typeof formData>(
    key: K,
    value: typeof formData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addInput = () => {
    setFormData({
      ...formData,
      inputs: [...formData.inputs, { itemId: "", qty: 1 }],
    });
    setHasChanges(true);
  };

  const removeInput = (index: number) => {
    setFormData({
      ...formData,
      inputs: formData.inputs.filter((_, i) => i !== index),
    });
    setHasChanges(true);
  };

  const updateInput = (
    index: number,
    field: keyof RecipeInput,
    value: string | number
  ) => {
    const newInputs = [...formData.inputs];
    newInputs[index] = { ...newInputs[index]!, [field]: value };
    setFormData({ ...formData, inputs: newInputs });
    setHasChanges(true);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
      setHasChanges(true);
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
    setHasChanges(true);
  };

  const updateRecipe = api.content.recipes.update.useMutation({
    onSuccess: () => {
      toast.success("Recipe updated");
      setHasChanges(false);
      void utils.content.recipes.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update recipe");
    },
  });

  const duplicateRecipe = api.content.recipes.duplicate.useMutation({
    onSuccess: (cloned) => {
      toast.success("Recipe duplicated");
      router.push(`/content/recipes/${cloned.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to duplicate recipe");
    },
  });

  const deleteRecipe = api.content.recipes.delete.useMutation({
    onSuccess: () => {
      toast.success("Recipe deleted");
      router.push("/content/recipes");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete recipe");
    },
  });

  const handleSave = () => {
    if (!formData.jobId) {
      toast.error("Please select a job");
      return;
    }

    if (!formData.station) {
      toast.error("Please select a station");
      return;
    }

    if (!formData.outputItemId) {
      toast.error("Please select an output item");
      return;
    }

    if (formData.inputs.length === 0) {
      toast.error("Please add at least one input");
      return;
    }

    if (formData.inputs.some((inp) => !inp.itemId)) {
      toast.error("Please fill in all input items");
      return;
    }

    updateRecipe.mutate({
      id,
      name: formData.name,
      description: formData.description || null,
      tags: formData.tags,
      jobId: formData.jobId,
      station: formData.station,
      requiredJobLevel: formData.requiredJobLevel,
      difficulty: formData.difficulty,
      craftTimeSeconds: formData.craftTimeSeconds,
      xp: formData.xp,
      outputItemId: formData.outputItemId,
      outputQty: formData.outputQty,
      inputs: formData.inputs,
      isActive: formData.isActive,
      allowNonGatherableInputs: formData.allowNonGatherableInputs,
      sourceGatherJobKey: formData.sourceGatherJobKey || null,
      status: formData.status,
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Loading recipe...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Recipe not found</p>
        <Link
          href="/content/recipes"
          className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
        >
          Back to Recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">{recipe.name}</h2>
          <p className="text-sm text-slate-400">ID: {recipe.id}</p>
        </div>
        <Link
          href="/content/recipes"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Recipes
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-cyan-400">Recipe Details</h3>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Job <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.jobId}
              onChange={(e) => updateField("jobId", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            >
              <option value="">Select a job...</option>
              {jobs?.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Station <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.station}
              onChange={(e) =>
                updateField(
                  "station",
                  e.target.value as typeof formData.station
                )
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            >
              <option value="">Select a station...</option>
              <option value="SMELTER">SMELTER</option>
              <option value="ANVIL">ANVIL</option>
              <option value="FORGE">FORGE</option>
              <option value="TEMPERING_RACK">TEMPERING_RACK</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Required Level
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={formData.requiredJobLevel}
                onChange={(e) =>
                  updateField("requiredJobLevel", parseInt(e.target.value) || 1)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Difficulty
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.difficulty}
                onChange={(e) =>
                  updateField("difficulty", parseInt(e.target.value) || 1)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Craft Time (seconds)
              </label>
              <input
                type="number"
                min={0}
                value={formData.craftTimeSeconds}
                onChange={(e) =>
                  updateField("craftTimeSeconds", parseInt(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                XP Reward
              </label>
              <input
                type="number"
                min={0}
                value={formData.xp}
                onChange={(e) =>
                  updateField("xp", parseInt(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                updateField("status", e.target.value as typeof formData.status)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => updateField("isActive", e.target.checked)}
                className="rounded border-slate-700"
              />
              <span className="text-sm text-slate-300">Active</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.allowNonGatherableInputs}
                onChange={(e) =>
                  updateField("allowNonGatherableInputs", e.target.checked)
                }
                className="rounded border-slate-700"
              />
              <span className="text-sm text-slate-300">
                Allow non-gatherable inputs
              </span>
            </label>
            {formData.allowNonGatherableInputs && (
              <p className="text-xs text-yellow-400">
                ⚠️ Warning: This allows inputs that aren't from gathering nodes or
                other recipes
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Source Gather Job Key (Advanced)
            </label>
            <input
              type="text"
              value={formData.sourceGatherJobKey}
              onChange={(e) => updateField("sourceGatherJobKey", e.target.value)}
              placeholder="e.g., miner (for blacksmith recipes)"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
            <p className="text-xs text-slate-400">
              If set, recipe inputs will be validated against items gatherable by this job instead of the recipe's job.
              Leave empty to use the recipe's job.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-cyan-400">Inputs & Outputs</h3>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Output Item <span className="text-red-400">*</span>
            </label>
            <ItemPicker
              value={formData.outputItemId}
              onChange={(itemId) => updateField("outputItemId", itemId)}
              required
            />
            <div className="mt-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Output Quantity
              </label>
              <input
                type="number"
                min={1}
                max={9999}
                value={formData.outputQty}
                onChange={(e) =>
                  updateField("outputQty", parseInt(e.target.value) || 1)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">
                Input Items <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={addInput}
                className="rounded-lg bg-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-600"
              >
                + Add Input
              </button>
            </div>
            <div className="space-y-2">
              {formData.inputs.map((input, index) => (
                <div
                  key={index}
                  className="flex gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-2"
                >
                  <div className="flex-1">
                    <ItemPicker
                      value={input.itemId}
                      onChange={(itemId) => updateInput(index, "itemId", itemId)}
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={input.qty}
                      onChange={(e) =>
                        updateInput(index, "qty", parseInt(e.target.value) || 1)
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                      placeholder="Qty"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInput(index)}
                    className="rounded-lg bg-red-600/20 px-2 py-1 text-sm text-red-400 transition hover:bg-red-600/30"
                  >
                    ×
                  </button>
                </div>
              ))}
              {formData.inputs.length === 0 && (
                <p className="text-sm text-slate-400">
                  No inputs added. Click "Add Input" to add items.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-600"
              >
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-1 text-xs text-cyan-400"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-cyan-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 border-t border-slate-700 pt-4">
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateRecipe.isPending}
          className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateRecipe.isPending
            ? "Saving..."
            : hasChanges
              ? "Save Changes"
              : "No Changes"}
        </button>
        <button
          onClick={() => {
            const name = prompt("Enter name for duplicated recipe:", `${recipe.name} (Copy)`);
            if (name) {
              duplicateRecipe.mutate({ id, name });
            }
          }}
          disabled={duplicateRecipe.isPending}
          className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          Duplicate
        </button>
        <button
          onClick={() => {
            if (
              confirm(
                "Are you sure you want to delete this recipe? This action cannot be undone."
              )
            ) {
              deleteRecipe.mutate({ id });
            }
          }}
          disabled={deleteRecipe.isPending}
          className="rounded-lg bg-red-600 px-6 py-2 font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

