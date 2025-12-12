"use client";

import { api } from "~/trpc/react";
import Link from "next/link";

export default function CombatPage() {
  const utils = api.useUtils();
  const { data: activeBattle, isLoading: battleLoading } =
    api.battle.getActiveBattle.useQuery();
  const { data: monsters, isLoading: monstersLoading } =
    api.battle.listMonsters.useQuery();
  const { data: player } = api.player.getCurrent.useQuery();

  const startBattle = api.battle.startBattle.useMutation({
    onSuccess: async () => {
      await utils.battle.getActiveBattle.invalidate();
    },
  });

  const attack = api.battle.attack.useMutation({
    onSuccess: async () => {
      await utils.battle.getActiveBattle.invalidate();
    },
  });

  const flee = api.battle.flee.useMutation({
    onSuccess: async () => {
      await utils.battle.getActiveBattle.invalidate();
    },
  });

  if (battleLoading || monstersLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show active battle if one exists
  if (activeBattle) {
    const log = Array.isArray(activeBattle.log) ? activeBattle.log : [];
    const monster = activeBattle.monster;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <h1 className="text-2xl font-bold text-cyan-400">Combat</h1>

          <div className="mt-6 space-y-6">
            {/* Battle Status */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Battle: {monster.name} (Level {monster.level})
                </h2>
                <span
                  className={`rounded px-3 py-1 text-sm font-medium ${
                    activeBattle.status === "ACTIVE"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : activeBattle.status === "WON"
                        ? "bg-green-500/20 text-green-400"
                        : activeBattle.status === "LOST"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-slate-500/20 text-slate-400"
                  }`}
                >
                  {activeBattle.status}
                </span>
              </div>

              {/* HP Bars */}
              <div className="space-y-4">
                {/* Player HP */}
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>Your HP</span>
                    <span>
                      {activeBattle.playerHp} / {player?.stats?.maxHP ?? 100} HP | {activeBattle.playerSp} / {player?.stats?.maxSP ?? 50} SP
                    </span>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{
                        width: `${Math.max(0, Math.min(100, ((activeBattle.playerHp / (player?.stats?.maxHP ?? 100)) * 100)))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Monster HP */}
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{monster.name} HP</span>
                    <span>{activeBattle.monsterHp} / {monster.maxHp}</span>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{
                        width: `${Math.max(0, Math.min(100, (activeBattle.monsterHp / monster.maxHp) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Battle Log */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
              <h3 className="mb-4 text-lg font-semibold">Battle Log</h3>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {log.length === 0 ? (
                  <p className="text-slate-400">No battle events yet...</p>
                ) : (
                  log.map((event: { message: string; turnNumber: number }, idx: number) => (
                    <div
                      key={idx}
                      className="rounded bg-slate-900/50 p-2 text-sm"
                    >
                      <span className="text-slate-400">Turn {event.turnNumber}:</span>{" "}
                      {event.message}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {activeBattle.status === "ACTIVE" && (
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    attack.mutate({ battleId: activeBattle.id });
                  }}
                  disabled={attack.isPending}
                  className="flex-1 rounded-xl bg-red-500/20 px-6 py-3 font-semibold text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
                >
                  {attack.isPending ? "Attacking..." : "Attack"}
                </button>
                <button
                  onClick={() => {
                    flee.mutate({ battleId: activeBattle.id });
                  }}
                  disabled={flee.isPending}
                  className="flex-1 rounded-xl bg-yellow-500/20 px-6 py-3 font-semibold text-yellow-400 transition hover:bg-yellow-500/30 disabled:opacity-50"
                >
                  {flee.isPending ? "Fleeing..." : "Flee"}
                </button>
              </div>
            )}

            {/* Battle End Actions */}
            {activeBattle.status !== "ACTIVE" && (
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    utils.battle.getActiveBattle.invalidate();
                  }}
                  className="flex-1 rounded-xl bg-cyan-500/20 px-6 py-3 font-semibold text-cyan-400 transition hover:bg-cyan-500/30"
                >
                  Refresh
                </button>
                <Link
                  href="/hub"
                  className="flex-1 rounded-xl bg-slate-500/20 px-6 py-3 text-center font-semibold text-slate-300 transition hover:bg-slate-500/30"
                >
                  Return to Hub
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show monster selection if no active battle
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <h1 className="text-2xl font-bold text-cyan-400">Combat</h1>
        <p className="mt-2 text-slate-400">
          Select a monster to start a battle
        </p>

        <div className="mt-6">
          {!monsters || monsters.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
              <p className="text-slate-400">No monsters available</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {monsters.map((monster) => (
                <div
                  key={monster.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-6"
                >
                  <h3 className="text-lg font-semibold">{monster.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Level {monster.level}
                  </p>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">HP:</span>
                      <span>{monster.maxHp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">XP Reward:</span>
                      <span>{monster.xpReward}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gold Reward:</span>
                      <span>{monster.goldReward}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      startBattle.mutate({ monsterId: monster.id });
                    }}
                    disabled={startBattle.isPending}
                    className="mt-4 w-full rounded-xl bg-cyan-500/20 px-4 py-2 font-semibold text-cyan-400 transition hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    {startBattle.isPending ? "Starting..." : "Start Battle"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <Link
            href="/hub"
            className="inline-block rounded-xl bg-slate-500/20 px-6 py-3 text-slate-300 transition hover:bg-slate-500/30"
          >
            Return to Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
