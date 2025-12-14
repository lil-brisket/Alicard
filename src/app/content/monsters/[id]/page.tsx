"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function MonsterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: monster, isLoading } = api.content.monsters.get.useQuery({
    id,
  });
  const utils = api.useUtils();

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

  const stats = monster.statsJSON as {
    vitality: number;
    strength: number;
    speed: number;
    dexterity: number;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">
            {monster.name}
          </h2>
          <p className="text-sm text-slate-400">ID: {monster.id}</p>
        </div>
        <Link
          href="/content/monsters"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Monsters
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">
            Monster Details
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-400">Level:</span>{" "}
              <span className="text-slate-300">{monster.level}</span>
            </div>
            <div>
              <span className="text-slate-400">HP:</span>{" "}
              <span className="text-slate-300">{monster.hp}</span>
            </div>
            <div>
              <span className="text-slate-400">SP:</span>{" "}
              <span className="text-slate-300">{monster.sp}</span>
            </div>
            <div className="mt-4">
              <span className="text-slate-400">Stats:</span>
              <div className="ml-4 mt-2 space-y-1">
                <div>Vitality: {stats.vitality}</div>
                <div>Strength: {stats.strength}</div>
                <div>Speed: {stats.speed}</div>
                <div>Dexterity: {stats.dexterity}</div>
              </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
