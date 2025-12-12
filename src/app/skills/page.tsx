"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SkillsPage() {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  if (learnedLoading || loadoutLoading) {
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
  const availableSkills = learnedSkills ?? [];

  const filteredSkills = availableSkills.filter((ps) =>
    ps.skill.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEquippedSkill = (slotIndex: number) => {
    return slots.find((slot) => slot.slotIndex === slotIndex)?.skill ?? null;
  };

  const isSkillEquipped = (skillId: string) => {
    return slots.some((slot) => slot.skill?.id === skillId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cyan-400">Skills</h1>
          <p className="mt-2 text-slate-400">View and manage your character skills</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Skill Loadout (8 slots) */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-cyan-400">Skill Loadout</h2>
            <p className="text-sm text-slate-400">Equip skills to your 8-slot action bar</p>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((slotIndex) => {
                const skill = getEquippedSkill(slotIndex);
                const isSelected = selectedSlot === slotIndex;
                return (
                  <div
                    key={slotIndex}
                    className={`rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-300">Slot {slotIndex}</h3>
                      <button
                        onClick={() => setSelectedSlot(isSelected ? null : slotIndex)}
                        className={`rounded px-2 py-1 text-xs transition ${
                          isSelected
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                    {skill ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-100">{skill.name}</p>
                        {skill.description && (
                          <p className="text-xs text-slate-400">{skill.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {skill.staminaCost > 0 && (
                            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
                              SP: {skill.staminaCost}
                            </span>
                          )}
                          {skill.cooldownSeconds > 0 && (
                            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
                              CD: {skill.cooldownSeconds}s
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            unequipMutation.mutate({ slotIndex });
                          }}
                          disabled={unequipMutation.isPending}
                          className="w-full rounded bg-red-500/20 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
                        >
                          Unequip
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Empty</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Learned Skills */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-cyan-400">
              {selectedSlot ? `Learned Skills - Slot ${selectedSlot}` : "Learned Skills"}
            </h2>
            {selectedSlot ? (
              <>
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                {filteredSkills.length > 0 ? (
                  <div className="max-h-[600px] space-y-2 overflow-y-auto">
                    {filteredSkills.map((playerSkill) => {
                      const skill = playerSkill.skill;
                      const isEquipped = isSkillEquipped(skill.id);
                      return (
                        <div
                          key={skill.id}
                          className={`rounded-xl border p-4 ${
                            isEquipped
                              ? "border-yellow-500/50 bg-yellow-500/5"
                              : "border-slate-800 bg-slate-950/60"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-100">{skill.name}</h3>
                                {isEquipped && (
                                  <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                                    Equipped
                                  </span>
                                )}
                              </div>
                              {skill.description && (
                                <p className="mt-1 text-xs text-slate-400">{skill.description}</p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-1">
                                {skill.staminaCost > 0 && (
                                  <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
                                    SP: {skill.staminaCost}
                                  </span>
                                )}
                                {skill.cooldownSeconds > 0 && (
                                  <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
                                    CD: {skill.cooldownSeconds}s
                                  </span>
                                )}
                                {skill.jobUnlock && (
                                  <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">
                                    {skill.jobUnlock}
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                Learned: {new Date(playerSkill.learnedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                equipMutation.mutate({
                                  skillId: skill.id,
                                  slotIndex: selectedSlot,
                                });
                              }}
                              disabled={equipMutation.isPending || isEquipped}
                              className={`ml-4 rounded px-4 py-2 text-sm transition disabled:opacity-50 ${
                                isEquipped
                                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                  : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                              }`}
                            >
                              {isEquipped ? "Equipped" : "Equip"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
                    <p className="text-slate-400">
                      {searchQuery ? "No skills found matching your search" : "No learned skills available"}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
                <p className="text-slate-400">Select a slot to view and equip skills</p>
                {availableSkills.length === 0 && (
                  <p className="mt-2 text-sm text-slate-500">You haven't learned any skills yet</p>
                )}
              </div>
            )}
          </div>
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

