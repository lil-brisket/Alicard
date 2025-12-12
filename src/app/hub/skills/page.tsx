"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SkillsPage() {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const { data: learnedSkills, isLoading: learnedLoading } = api.skills.getLearned.useQuery();
  const { data: loadout, isLoading: loadoutLoading, refetch: refetchLoadout } = api.skills.getLoadout.useQuery();

  const equipMutation = api.skills.equip.useMutation({
    onSuccess: () => {
      toast.success("Skill equipped!");
      void refetchLoadout();
      setSelectedSlot(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to equip skill");
    },
  });

  const unequipMutation = api.skills.unequip.useMutation({
    onSuccess: () => {
      toast.success("Skill unequipped!");
      void refetchLoadout();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to unequip skill");
    },
  });

  if (loadoutLoading || learnedLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <h1 className="text-2xl font-bold text-cyan-400">Skills</h1>
          <p className="mt-2 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const slots = loadout?.slots ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cyan-400">Skills</h1>
          <p className="mt-2 text-slate-400">Manage your skill loadout</p>
        </div>

        {/* Skill Bar (8 slots) */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-cyan-400">Skill Bar</h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {slots.map((slot) => {
              const isSelected = selectedSlot === slot.slotIndex;
              return (
                <div
                  key={slot.slotIndex}
                  className={`relative rounded-xl border p-3 transition ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  }`}
                >
                  <div className="mb-1 text-center">
                    <span className="text-xs font-semibold text-slate-400">{slot.slotIndex}</span>
                  </div>
                  {slot.skill ? (
                    <div className="space-y-2">
                      <p className="text-center text-xs font-medium text-slate-100">{slot.skill.name}</p>
                      <div className="text-center">
                        <span className="text-xs text-slate-500">
                          {slot.skill.staminaCost > 0 && `SP: ${slot.skill.staminaCost}`}
                          {slot.skill.cooldownSeconds > 0 && ` CD: ${slot.skill.cooldownSeconds}s`}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelectedSlot(isSelected ? null : slot.slotIndex)}
                          className="flex-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-700"
                        >
                          {isSelected ? "Selected" : "Change"}
                        </button>
                        <button
                          onClick={() => {
                            unequipMutation.mutate({ slotIndex: slot.slotIndex });
                          }}
                          disabled={unequipMutation.isPending}
                          className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-center text-xs text-slate-500">Empty</p>
                      <button
                        onClick={() => setSelectedSlot(isSelected ? null : slot.slotIndex)}
                        className="w-full rounded bg-slate-800 px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-700"
                      >
                        {isSelected ? "Selected" : "Equip"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Learned Skills List */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-cyan-400">
            Learned Skills {selectedSlot && `(Select for slot ${selectedSlot})`}
          </h2>
          {learnedSkills && learnedSkills.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {learnedSkills.map((playerSkill) => {
                const skill = playerSkill.skill;
                const isEquipped = slots.some((s) => s.skill?.id === skill.id);
                return (
                  <div
                    key={playerSkill.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="mb-2">
                      <h3 className="font-semibold text-slate-100">{skill.name}</h3>
                      {skill.description && (
                        <p className="mt-1 text-sm text-slate-400">{skill.description}</p>
                      )}
                    </div>
                    <div className="mb-3 flex flex-wrap gap-1">
                      {skill.staminaCost > 0 && (
                        <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                          SP: {skill.staminaCost}
                        </span>
                      )}
                      {skill.cooldownSeconds > 0 && (
                        <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                          CD: {skill.cooldownSeconds}s
                        </span>
                      )}
                    </div>
                    {isEquipped && (
                      <p className="mb-2 text-xs text-green-400">✓ Equipped</p>
                    )}
                    {selectedSlot && (
                      <button
                        onClick={() => {
                          equipMutation.mutate({
                            skillId: skill.id,
                            slotIndex: selectedSlot,
                          });
                        }}
                        disabled={equipMutation.isPending}
                        className="w-full rounded bg-cyan-500/20 px-4 py-2 text-sm text-cyan-400 transition hover:bg-cyan-500/30 disabled:opacity-50"
                      >
                        Equip to Slot {selectedSlot}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
              <h2 className="text-xl font-semibold text-slate-100">No Skills Learned</h2>
              <p className="mt-2 text-slate-400">
                Learn skills through quests, jobs, or other activities.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Link
            href="/hub"
            className="inline-block rounded-xl bg-cyan-500/20 px-6 py-3 text-cyan-400 transition hover:bg-cyan-500/30"
          >
            Return to Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
