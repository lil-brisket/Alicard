"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function NewMonsterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level: 1,
    hp: 100,
    sp: 0,
    damage: 0,
    goldReward: 0,
    vitality: 10,
    strength: 10,
    speed: 10,
    dexterity: 10,
    lootTableId: "",
  });

  const createMonster = api.content.monsters.create.useMutation({
    onSuccess: (monster) => {
      toast.success("Monster created");
      router.push(`/content/monsters/${monster.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { vitality, strength, speed, dexterity, lootTableId, ...data } =
      formData;
    createMonster.mutate({
      ...data,
      statsJSON: {
        vitality,
        strength,
        speed,
        dexterity,
      },
      lootTableId: lootTableId || undefined,
    });
  };

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-cyan-400">
        Create New Monster
      </h2>

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Level *
            </label>
            <input
              type="number"
              required
              min={1}
              value={formData.level}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  level: parseInt(e.target.value) || 1,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">
              HP *
            </label>
            <input
              type="number"
              required
              min={1}
              value={formData.hp}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  hp: parseInt(e.target.value) || 1,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">
              SP
            </label>
            <input
              type="number"
              min={0}
              value={formData.sp}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sp: parseInt(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">
              Damage
            </label>
            <input
              type="number"
              min={0}
              value={formData.damage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  damage: parseInt(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Gold Reward (Coins)
          </label>
          <input
            type="number"
            min={0}
            value={formData.goldReward}
            onChange={(e) =>
              setFormData({
                ...formData,
                goldReward: parseInt(e.target.value) || 0,
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
          <p className="mt-1 text-xs text-slate-400">
            Coins rewarded when this monster is defeated
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Stats
          </label>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400">Vitality</label>
              <input
                type="number"
                min={0}
                value={formData.vitality}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vitality: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400">Strength</label>
              <input
                type="number"
                min={0}
                value={formData.strength}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    strength: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400">Speed</label>
              <input
                type="number"
                min={0}
                value={formData.speed}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    speed: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400">Dexterity</label>
              <input
                type="number"
                min={0}
                value={formData.dexterity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dexterity: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Loot Table ID (Optional)
          </label>
          <input
            type="text"
            value={formData.lootTableId}
            onChange={(e) =>
              setFormData({ ...formData, lootTableId: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createMonster.isPending}
            className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
          >
            {createMonster.isPending ? "Creating..." : "Create Monster"}
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
