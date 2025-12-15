"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function NewSkillPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    key: "",
    name: "",
    description: "",
    tags: [] as string[],
    status: "DRAFT" as "DRAFT" | "ACTIVE" | "DISABLED",
    staminaCost: 0,
    cooldownTurns: 0,
    levelUnlock: undefined as number | undefined,
    cloneFromId: "",
  });
  
  const [newTag, setNewTag] = useState("");
  
  const { data: skills } = api.content.skills.list.useQuery({
    limit: 100,
  });

  const createSkill = api.content.skills.create.useMutation({
    onSuccess: (skill) => {
      toast.success("Skill created");
      router.push(`/content/skills/${skill.id}`);
    },
    onError: (error) => {
      console.error("Create skill error:", error);
      const errorMessage = error.data?.zodError?.fieldErrors 
        ? Object.values(error.data.zodError.fieldErrors).flat().join(", ")
        : error.message || "Failed to create skill. Please check the console for details.";
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { cloneFromId, ...data } = formData;
    createSkill.mutate({
      ...data,
      staminaCost: Number(data.staminaCost) || 0,
      cooldownTurns: Number(data.cooldownTurns) || 0,
      levelUnlock: data.levelUnlock || undefined,
      cloneFromId: cloneFromId || undefined,
    });
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

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-cyan-400">Create New Skill</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Key *
          </label>
          <input
            type="text"
            required
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-slate-100"
            placeholder="e.g., fire_bolt, heal, slash"
          />
          <p className="mt-1 text-xs text-slate-400">
            Unique identifier (lowercase, underscores). This cannot be changed after creation.
          </p>
        </div>

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

        <div>
          <label className="block text-sm font-medium text-slate-300">
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
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          >
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Tags
          </label>
          <div className="mt-1 flex gap-2">
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
              placeholder="Add tag (e.g., combat, fire, starter)"
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

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Clone From (Optional)
          </label>
          <select
            value={formData.cloneFromId}
            onChange={(e) =>
              setFormData({ ...formData, cloneFromId: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          >
            <option value="">None - Create New</option>
            {skills?.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name} ({skill.key})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Select an existing skill to clone its properties
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Stamina Cost
          </label>
          <input
            type="number"
            min={0}
            value={formData.staminaCost}
            onChange={(e) =>
              setFormData({
                ...formData,
                staminaCost: parseInt(e.target.value) || 0,
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Cooldown (Turns)
          </label>
          <input
            type="number"
            min={0}
            value={formData.cooldownTurns}
            onChange={(e) =>
              setFormData({
                ...formData,
                cooldownTurns: parseInt(e.target.value) || 0,
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Level Unlock (Optional)
          </label>
          <input
            type="number"
            min={1}
            value={formData.levelUnlock ?? ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                levelUnlock: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            placeholder="e.g., 5, 10, 20"
          />
          <p className="mt-1 text-xs text-slate-400">
            Level required to unlock this skill
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createSkill.isPending}
            className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
          >
            {createSkill.isPending ? "Creating..." : "Create Skill"}
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
