"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function NewItemPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: [] as string[],
    status: "DRAFT" as "DRAFT" | "ACTIVE" | "DISABLED",
    rarity: "COMMON" as const,
    stackable: false,
    maxStack: 1,
    value: 0,
    icon: "",
    cloneFromId: "",
  });
  
  const [newTag, setNewTag] = useState("");
  
  const { data: items } = api.content.items.list.useQuery({
    limit: 100,
  });

  const createItem = api.content.items.create.useMutation({
    onSuccess: (item) => {
      toast.success("Item created");
      router.push(`/content/items/${item.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { cloneFromId, ...data } = formData;
    createItem.mutate({
      ...data,
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
      <h2 className="mb-6 text-xl font-semibold text-cyan-400">Create New Item</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Add tag (e.g., fire, starter, rare)"
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
            {items?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Select an existing item to clone its properties
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Rarity *
          </label>
          <select
            value={formData.rarity}
            onChange={(e) =>
              setFormData({
                ...formData,
                rarity: e.target.value as typeof formData.rarity,
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.stackable}
              onChange={(e) =>
                setFormData({ ...formData, stackable: e.target.checked })
              }
              className="rounded border-slate-700"
            />
            <span className="text-sm text-slate-300">Stackable</span>
          </label>
        </div>

        {formData.stackable && (
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Max Stack
            </label>
            <input
              type="number"
              min={1}
              value={formData.maxStack}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxStack: parseInt(e.target.value) || 1,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Value
          </label>
          <input
            type="number"
            min={0}
            value={formData.value}
            onChange={(e) =>
              setFormData({
                ...formData,
                value: parseInt(e.target.value) || 0,
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Icon URL
          </label>
          <input
            type="text"
            value={formData.icon}
            onChange={(e) =>
              setFormData({ ...formData, icon: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createItem.isPending}
            className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
          >
            {createItem.isPending ? "Creating..." : "Create Item"}
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
