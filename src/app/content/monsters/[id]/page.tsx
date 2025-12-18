"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

interface MonsterStats {
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
}

interface FormState {
  name: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "DISABLED";
  level: number;
  hp: number;
  sp: number;
  damage: number;
  goldReward: number;
  stats: MonsterStats;
}

export default function MonsterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: monster, isLoading } = api.content.monsters.get.useQuery({ id });
  const utils = api.useUtils();

  const [hasChanges, setHasChanges] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    status: "DRAFT",
    level: 1,
    hp: 100,
    sp: 0,
    damage: 0,
    goldReward: 0,
    stats: { vitality: 10, strength: 10, speed: 10, dexterity: 10 },
  });

  useEffect(() => {
    if (monster) {
      const stats = monster.statsJSON as unknown as MonsterStats;
      setForm({
        name: monster.name,
        description: monster.description ?? "",
        status: monster.status,
        level: monster.level,
        hp: monster.hp,
        sp: monster.sp,
        damage: monster.damage ?? 0,
        goldReward: monster.goldReward ?? 0,
        stats,
      });
      setHasChanges(false);
    }
  }, [monster]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateMonster = api.content.monsters.update.useMutation({
    onSuccess: () => {
      toast.success("Monster saved");
      setHasChanges(false);
      void utils.content.monsters.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    updateMonster.mutate({
      id,
      name: form.name,
      status: form.status,
      level: form.level,
      hp: form.hp,
      sp: form.sp,
      damage: form.damage,
      goldReward: form.goldReward,
      statsJSON: form.stats,
    });
  };

  const archiveMonster = api.content.monsters.archive.useMutation({
    onSuccess: () => {
      toast.success("Monster archived");
      void utils.content.monsters.get.invalidate({ id });
    },
  });

  const unarchiveMonster = api.content.monsters.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Monster unarchived");
      void utils.content.monsters.get.invalidate({ id });
    },
  });

  const deleteMonster = api.content.monsters.delete.useMutation({
    onSuccess: () => {
      toast.success("Monster deleted");
      router.push("/content/monsters");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Loading monster...</p>
      </div>
    );
  }

  if (!monster) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Monster not found</p>
        <Link
          href="/content/monsters"
          className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
        >
          Back to Monsters
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">{monster.name}</h2>
          <p className="text-sm text-slate-400">ID: {monster.id}</p>
        </div>
        <Link
          href="/content/monsters"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Monsters
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">
            Monster Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Status</label>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Level</label>
                <input
                  type="number"
                  min={1}
                  value={form.level}
                  onChange={(e) => updateField("level", parseInt(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">HP</label>
                <input
                  type="number"
                  min={1}
                  value={form.hp}
                  onChange={(e) => updateField("hp", parseInt(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">SP</label>
                <input
                  type="number"
                  min={0}
                  value={form.sp}
                  onChange={(e) => updateField("sp", parseInt(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Damage</label>
                <input
                  type="number"
                  min={0}
                  value={form.damage}
                  onChange={(e) => updateField("damage", parseInt(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Gold Reward</label>
                <input
                  type="number"
                  min={0}
                  value={form.goldReward}
                  onChange={(e) => updateField("goldReward", parseInt(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
            </div>

            {/* Stats Section */}
            <div className="border-t border-slate-700 pt-4">
              <h4 className="mb-3 text-sm font-semibold text-cyan-400">Monster Stats</h4>
              <div className="grid grid-cols-2 gap-3">
                {(["vitality", "strength", "speed", "dexterity"] as const).map((stat) => (
                  <div key={stat}>
                    <label className="block text-xs font-medium text-slate-400 capitalize">{stat}</label>
                    <input
                      type="number"
                      min={0}
                      value={form.stats[stat]}
                      onChange={(e) => updateField("stats", { ...form.stats, [stat]: parseInt(e.target.value) || 0 })}
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
                disabled={!hasChanges || updateMonster.isPending}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMonster.isPending ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Actions</h3>
            <div className="space-y-3">
              {monster.isArchived ? (
                <button
                  onClick={() => unarchiveMonster.mutate({ id })}
                  disabled={unarchiveMonster.isPending}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  Unarchive Monster
                </button>
              ) : (
                <button
                  onClick={() => archiveMonster.mutate({ id })}
                  disabled={archiveMonster.isPending}
                  className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:opacity-50"
                >
                  Archive Monster
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to permanently delete this monster?")) {
                    deleteMonster.mutate({ id });
                  }
                }}
                disabled={deleteMonster.isPending}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                Delete Monster
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Status:</span>{" "}
                <span className={monster.status === "ACTIVE" ? "text-green-400" : monster.status === "DISABLED" ? "text-red-400" : "text-yellow-400"}>
                  {monster.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Version:</span>{" "}
                <span className="text-slate-300">{monster.version}</span>
              </div>
              <div>
                <span className="text-slate-400">Created:</span>{" "}
                <span className="text-slate-300">{new Date(monster.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400">Updated:</span>{" "}
                <span className="text-slate-300">{new Date(monster.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
