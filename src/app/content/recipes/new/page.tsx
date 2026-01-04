"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { ItemPicker } from "../_components/item-picker";

type RecipeInput = {
  itemId: string;
  qty: number;
};

type RecipeOutput = {
  itemId: string;
  qty: number;
};

export default function NewRecipePage() {
  const router = useRouter();
  const { data: jobs } = api.jobs.listJobs.useQuery();

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
    status: "DRAFT" as "DRAFT" | "ACTIVE" | "DISABLED",
  });

  const [newTag, setNewTag] = useState("");

  const createRecipe = api.content.recipes.create.useMutation({
    onSuccess: (recipe) => {
      toast.success("Recipe created");
      router.push(`/content/recipes/${recipe.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create recipe");
    },
  });

  const addInput = () => {
    setFormData({
      ...formData,
      inputs: [...formData.inputs, { itemId: "", qty: 1 }],
    });
  };

  const removeInput = (index: number) => {
    setFormData({
      ...formData,
      inputs: formData.inputs.filter((_, i) => i !== index),
    });
  };

  const updateInput = (index: number, field: keyof RecipeInput, value: string | number) => {
    const newInputs = [...formData.inputs];
    newInputs[index] = { ...newInputs[index]!, [field]: value };
    setFormData({ ...formData, inputs: newInputs });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    createRecipe.mutate({
      name: formData.name,
      description: formData.description || undefined,
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
      status: formData.status,
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-cyan-400">Create New Recipe</h2>
        <Link
          href="/content/recipes"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Recipes
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Job <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={formData.jobId}
                onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
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
                required
                value={formData.station}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    station: e.target.value as typeof formData.station,
                  })
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
                    setFormData({
                      ...formData,
                      requiredJobLevel: parseInt(e.target.value) || 1,
                    })
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
                    setFormData({
                      ...formData,
                      difficulty: parseInt(e.target.value) || 1,
                    })
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
                    setFormData({
                      ...formData,
                      craftTimeSeconds: parseInt(e.target.value) || 0,
                    })
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
                    setFormData({
                      ...formData,
                      xp: parseInt(e.target.value) || 0,
                    })
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
                  setFormData({
                    ...formData,
                    status: e.target.value as typeof formData.status,
                  })
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
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded border-slate-700"
                />
                <span className="text-sm text-slate-300">Active</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allowNonGatherableInputs}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allowNonGatherableInputs: e.target.checked,
                    })
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
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Output Item <span className="text-red-400">*</span>
              </label>
              <ItemPicker
                value={formData.outputItemId}
                onChange={(itemId) =>
                  setFormData({ ...formData, outputItemId: itemId })
                }
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
                    setFormData({
                      ...formData,
                      outputQty: parseInt(e.target.value) || 1,
                    })
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
                        onChange={(itemId) =>
                          updateInput(index, "itemId", itemId)
                        }
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

        <div className="flex gap-4 border-t border-slate-700 pt-4">
          <button
            type="submit"
            disabled={createRecipe.isPending}
            className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
          >
            {createRecipe.isPending ? "Creating..." : "Create Recipe"}
          </button>
          <Link
            href="/content/recipes"
            className="rounded-lg bg-slate-700 px-6 py-2 font-medium text-slate-300 transition hover:bg-slate-600"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

