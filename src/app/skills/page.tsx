"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SkillsPage() {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);

  const utils = api.useUtils();
  const { data: learnedSkills, isLoading: learnedLoading } = api.skills.getLearned.useQuery();
  const { data: loadout, isLoading: loadoutLoading, refetch: refetchLoadout } = api.skills.getLoadout.useQuery();

  const equipMutation = api.skills.equip.useMutation({
    onSuccess: () => {
      toast.success("Skill equipped!");
      void refetchLoadout();
      void utils.skills.getLearned.invalidate();
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
      void utils.skills.getLearned.invalidate();
      setPendingSlot(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to unequip skill");
      setPendingSlot(null);
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

  const handleSlotClick = (slotIndex: number) => {
    if (selectedSlot === slotIndex) {
      setSelectedSlot(null);
      setExpandedSlot(null);
    } else {
      setSelectedSlot(slotIndex);
      setExpandedSlot(null);
    }
  };

  const handleSlotKeyDown = (e: React.KeyboardEvent, slotIndex: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSlotClick(slotIndex);
    }
  };

  const handleItemClick = (slotIndex: number) => {
    if (expandedSlot === slotIndex) {
      setExpandedSlot(null);
    } else {
      setExpandedSlot(slotIndex);
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, slotIndex: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleItemClick(slotIndex);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cyan-400">Skills</h1>
          <p className="mt-2 text-slate-400">Manage your skill loadout</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Skill Loadout (8 slots) */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-cyan-400">Skill Loadout</h2>
            
            {/* Skill Slots Grid */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-400">Action Bar (8 Slots)</h3>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((slotIndex) => {
                  const skill = getEquippedSkill(slotIndex);
                  const isSelected = selectedSlot === slotIndex;
                  const isExpanded = expandedSlot === slotIndex;
                  const isPending = pendingSlot === slotIndex;
                  
                  return (
                    <div
                      key={slotIndex}
                      className={`group relative flex flex-col items-center transition-all ${
                        isSelected
                          ? "z-10 scale-110"
                          : "hover:scale-105"
                      }`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        aria-label={`Slot ${slotIndex}${skill ? `, equipped: ${skill.name}` : ", empty"}`}
                        className={`relative flex h-[64px] w-[64px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 transition-all duration-200 ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-500/20 ring-2 ring-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.35)] animate-pulse"
                            : skill
                              ? "border-purple-500 bg-purple-500/20 ring-1 ring-white/10 hover:ring-white/25 hover:border-purple-400 hover:bg-purple-500/30"
                              : "border-slate-600 bg-slate-800/60 ring-1 ring-white/10 hover:ring-white/25 hover:border-slate-500 hover:bg-slate-800/80"
                        }`}
                        onClick={() => {
                          handleSlotClick(slotIndex);
                          // On mobile/touch, also toggle expanded view
                          if (!isExpanded && skill) {
                            setExpandedSlot(slotIndex);
                          }
                        }}
                        onKeyDown={(e) => handleSlotKeyDown(e, slotIndex)}
                      >
                        {skill ? (
                          <>
                            {/* Skill name (truncated) */}
                            <span className="max-w-[90%] truncate text-[10px] font-semibold text-slate-100">
                              {skill.name}
                            </span>
                            {/* Skill cost indicators */}
                            <div className="flex gap-0.5 mt-0.5">
                              {skill.staminaCost > 0 && (
                                <span className="text-[8px] text-blue-400">SP:{skill.staminaCost}</span>
                              )}
                              {skill.cooldownSeconds > 0 && (
                                <span className="text-[8px] text-purple-400">CD:{skill.cooldownSeconds}s</span>
                              )}
                            </div>
                            {/* Unequip button on hover/desktop */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingSlot(slotIndex);
                                unequipMutation.mutate({ slotIndex });
                              }}
                              disabled={isPending}
                              className="absolute right-0 top-0 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500/80 text-[10px] text-white transition hover:bg-red-500 disabled:opacity-50 group-hover:flex"
                              title="Unequip"
                            >
                              {isPending ? "..." : "×"}
                            </button>
                          </>
                        ) : (
                          <span className="text-lg text-slate-400 font-light">+</span>
                        )}
                        {/* Tooltip on hover (desktop) */}
                        {skill && (
                          <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow-lg group-hover:block">
                            <div className="font-semibold">{skill.name}</div>
                            {skill.description && (
                              <div className="text-[10px] text-slate-400 mt-0.5 max-w-[200px]">{skill.description}</div>
                            )}
                            <div className="mt-1 flex flex-wrap gap-1">
                              {skill.staminaCost > 0 && (
                                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400">
                                  SP: {skill.staminaCost}
                                </span>
                              )}
                              {skill.cooldownSeconds > 0 && (
                                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-400">
                                  CD: {skill.cooldownSeconds}s
                                </span>
                              )}
                              {skill.jobUnlock && (
                                <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] text-yellow-400">
                                  {skill.jobUnlock}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Mobile/Expanded detail panel */}
                      {isExpanded && skill && (
                        <div className="absolute left-1/2 top-full z-20 mt-2 w-48 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-100 shadow-lg">
                          <div className="mb-1 font-semibold">Equipped: {skill.name}</div>
                          {skill.description && (
                            <div className="mb-2 text-slate-400">{skill.description}</div>
                          )}
                          <div className="mb-2 flex flex-wrap gap-1">
                            {skill.staminaCost > 0 && (
                              <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400">
                                SP: {skill.staminaCost}
                              </span>
                            )}
                            {skill.cooldownSeconds > 0 && (
                              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-400">
                                CD: {skill.cooldownSeconds}s
                              </span>
                            )}
                            {skill.jobUnlock && (
                              <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] text-yellow-400">
                                {skill.jobUnlock}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingSlot(slotIndex);
                              unequipMutation.mutate({ slotIndex });
                            }}
                            disabled={isPending}
                            className="w-full rounded bg-red-500/20 px-2 py-1 text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
                          >
                            {isPending ? "Unequipping..." : "Unequip"}
                          </button>
                        </div>
                      )}
                      {/* Slot label - hidden by default, shown on hover/selected */}
                      <div 
                        className={`mt-2 whitespace-nowrap text-sm font-medium cursor-pointer transition-all ${
                          isSelected 
                            ? "opacity-100 text-cyan-300 font-semibold" 
                            : "opacity-70 group-hover:opacity-100 group-hover:text-slate-100"
                        }`}
                        onClick={() => handleItemClick(slotIndex)}
                        onKeyDown={(e) => handleItemKeyDown(e, slotIndex)}
                        role="button"
                        tabIndex={0}
                      >
                        Slot {slotIndex}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Learned Skills */}
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                {selectedSlot ? (
                  <>
                    <h2 className="text-xl font-semibold text-cyan-400">
                      Selected: Slot {selectedSlot}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Showing available skills for Slot {selectedSlot}
                    </p>
                    <p className="text-xs text-slate-500">
                      Only learned skills appear here.
                    </p>
                  </>
                ) : (
                  <h2 className="text-xl font-semibold text-cyan-400">
                    Select a slot to view skills
                  </h2>
                )}
              </div>
            </div>
            {selectedSlot ? (
              <>
                <div>
                  <p className="mb-2 text-sm text-slate-400">
                    Only learned skills appear on the right.
                  </p>
                  <input
                    type="text"
                    placeholder="Search skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                {filteredSkills.length > 0 ? (
                  <div className="max-h-[600px] space-y-2 overflow-y-auto">
                    {filteredSkills.map((playerSkill) => {
                      const skill = playerSkill.skill;
                      const isEquipped = isSkillEquipped(skill.id);
                      return (
                        <div
                          key={skill.id}
                          className={`rounded-xl border border-slate-800 bg-slate-950/60 p-4 ${
                            isEquipped
                              ? "border-yellow-500/50 bg-yellow-500/5"
                              : ""
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
                              className={`ml-4 flex items-center gap-2 rounded bg-cyan-500/20 px-4 py-2 text-sm text-cyan-400 transition hover:bg-cyan-500/30 disabled:opacity-50 ${
                                isEquipped ? "cursor-not-allowed" : ""
                              }`}
                            >
                              {equipMutation.isPending && (
                                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              )}
                              {isEquipped ? "Equipped" : equipMutation.isPending ? "Equipping..." : "Equip"}
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
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center">
                <p className="mb-4 text-slate-400">Pick a slot to view available skills.</p>
                <div className="space-y-2 text-left text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">•</span>
                    <span>Click a slot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">•</span>
                    <span>Pick a skill</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">•</span>
                    <span>Swap anytime</span>
                  </div>
                </div>
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

