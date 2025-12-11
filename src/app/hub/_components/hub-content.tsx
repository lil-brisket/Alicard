"use client";

import { api } from "~/trpc/react";
import Link from "next/link";

export function HubContent() {
  const { data: character, isLoading } = api.character.getOrCreateCurrent.useQuery();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-slate-300">Loading your character...</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-slate-300">Unable to load character</p>
      </div>
    );
  }

  const isPermaDead = character.deaths >= 5;
  const deathsRemaining = Math.max(0, 5 - character.deaths);

  return (
    <div className="space-y-6">
      {/* Character Overview */}
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">Character Overview</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-300">Character Name</p>
            <p className="text-lg font-semibold">{character.name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Level</p>
            <p className="text-lg font-semibold">{character.level}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Location</p>
            <p className="text-lg font-semibold">{character.location}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Floor</p>
            <p className="text-lg font-semibold">Floor {character.floor}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">Stats</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-slate-300">Vitality</p>
            <p className="text-xl font-semibold">{character.vitality}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Strength</p>
            <p className="text-xl font-semibold">{character.strength}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Speed</p>
            <p className="text-xl font-semibold">{character.speed}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Dexterity</p>
            <p className="text-xl font-semibold">{character.dexterity}</p>
          </div>
        </div>
      </div>

      {/* Health & Stamina */}
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">Resources</h2>
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-300">Health</span>
              <span className="font-medium">
                {character.currentHp} / {character.maxHp}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full bg-red-500 transition-all"
                style={{
                  width: `${(character.currentHp / character.maxHp) * 100}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-300">Stamina</span>
              <span className="font-medium">
                {character.currentStamina} / {character.maxStamina}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{
                  width: `${(character.currentStamina / character.maxStamina) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Death Counter */}
      <div
        className={`rounded-xl p-6 ${
          isPermaDead
            ? "bg-red-950/60 border-2 border-red-700"
            : "bg-white/10"
        }`}
      >
        <h2 className="mb-4 text-2xl font-bold">
          {isPermaDead ? "Perma-Death Status" : "Death Counter"}
        </h2>
        {isPermaDead ? (
          <div className="space-y-2">
            <p className="text-lg font-semibold text-red-300">
              Your character has perished permanently
            </p>
            <p className="text-slate-300">
              Deaths: {character.deaths} / 5
            </p>
            <p className="text-sm text-slate-400">
              Your character has reached the maximum number of deaths. This
              character can no longer be played.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-lg font-semibold">
              Deaths: {character.deaths} / 5
            </p>
            <p className="text-slate-300">
              {deathsRemaining} death{deathsRemaining !== 1 ? "s" : ""}{" "}
              remaining before perma-death
            </p>
            <div className="mt-3 flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 flex-1 rounded ${
                    i < character.deaths
                      ? "bg-red-600"
                      : i < 5
                        ? "bg-slate-600"
                        : "bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/play"
            className="rounded-lg bg-[hsl(280,100%,70%)] px-4 py-2 font-semibold text-white transition hover:bg-[hsl(280,100%,65%)]"
          >
            Enter the Tower
          </Link>
        </div>
      </div>
    </div>
  );
}

