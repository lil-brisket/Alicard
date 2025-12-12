"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import toast from "react-hot-toast";
import Image from "next/image";

type EquipmentSlot = "HEAD" | "LEFT_ARM" | "RIGHT_ARM" | "BODY" | "LEGS" | "FEET" | "RING" | "NECKLACE" | "BELT" | "CLOAK";

const slotLabels: Record<EquipmentSlot, string> = {
  HEAD: "Head",
  LEFT_ARM: "Left Arm",
  RIGHT_ARM: "Right Arm",
  BODY: "Body",
  LEGS: "Legs",
  FEET: "Feet",
  RING: "Ring",
  NECKLACE: "Necklace",
  BELT: "Belt",
  CLOAK: "Cloak",
};

const bodySlots: EquipmentSlot[] = ["HEAD", "LEFT_ARM", "RIGHT_ARM", "BODY", "LEGS", "FEET"];
const accessorySlots: EquipmentSlot[] = ["RING", "NECKLACE", "BELT", "CLOAK"];

// Position coordinates for body slots (percentage-based for responsiveness)
const slotPositions: Record<EquipmentSlot, { top: string; left: string }> = {
  HEAD: { top: "5%", left: "50%" },
  LEFT_ARM: { top: "25%", left: "15%" },
  RIGHT_ARM: { top: "25%", left: "85%" },
  BODY: { top: "35%", left: "50%" },
  LEGS: { top: "65%", left: "50%" },
  FEET: { top: "90%", left: "50%" },
  RING: { top: "0", left: "0" }, // Not used for body positioning
  NECKLACE: { top: "0", left: "0" },
  BELT: { top: "0", left: "0" },
  CLOAK: { top: "0", left: "0" },
};

export default function EquipmentPage() {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: loadout, isLoading: loadoutLoading, refetch: refetchLoadout } = api.equipment.getLoadout.useQuery();
  const { data: equippableItems, isLoading: itemsLoading } = api.equipment.getEquippableInventory.useQuery(
    { slot: selectedSlot ?? undefined },
    { enabled: !!selectedSlot }
  );

  const equipMutation = api.equipment.equipItem.useMutation({
    onSuccess: () => {
      toast.success("Item equipped!");
      void refetchLoadout();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to equip item");
    },
  });

  const unequipMutation = api.equipment.unequip.useMutation({
    onSuccess: () => {
      toast.success("Item unequipped!");
      void refetchLoadout();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to unequip item");
    },
  });

  if (loadoutLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <h1 className="text-2xl font-bold text-cyan-400">Equipment</h1>
          <p className="mt-2 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const equipment = loadout?.equipment;
  const totalStats = loadout?.totalStats;

  const getEquippedRing = () => {
    if (!equipment) return null;
    // Return the first equipped ring
    if (equipment.ring1) return { item: equipment.ring1, index: 1 };
    if (equipment.ring2) return { item: equipment.ring2, index: 2 };
    if (equipment.ring3) return { item: equipment.ring3, index: 3 };
    return null;
  };

  const getEquippedItem = (slot: EquipmentSlot) => {
    if (!equipment) return null;
    switch (slot) {
      case "HEAD":
        return equipment.head;
      case "LEFT_ARM":
        return equipment.leftArm;
      case "RIGHT_ARM":
        return equipment.rightArm;
      case "BODY":
        return equipment.body;
      case "LEGS":
        return equipment.legs;
      case "FEET":
        return equipment.feet;
      case "RING": {
        const ring = getEquippedRing();
        return ring?.item ?? null;
      }
      case "NECKLACE":
        return equipment.necklace;
      case "BELT":
        return equipment.belt;
      case "CLOAK":
        return equipment.cloak;
      default:
        return null;
    }
  };

  const getRingSlotIndex = (): number => {
    const ring = getEquippedRing();
    return ring?.index ?? 1;
  };

  const filteredItems = equippableItems?.filter((group) =>
    group.item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cyan-400">Equipment</h1>
          <p className="mt-2 text-slate-400">Manage your equipped items</p>
        </div>

        {/* Total Stats Summary */}
        {totalStats && (
          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="mb-3 text-lg font-semibold text-cyan-400">Total Equipment Bonuses</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
              <div>
                <span className="text-xs text-slate-400">Vitality</span>
                <p className="text-lg font-semibold text-green-400">+{totalStats.vitality}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Strength</span>
                <p className="text-lg font-semibold text-red-400">+{totalStats.strength}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Speed</span>
                <p className="text-lg font-semibold text-yellow-400">+{totalStats.speed}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Dexterity</span>
                <p className="text-lg font-semibold text-blue-400">+{totalStats.dexterity}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">HP</span>
                <p className="text-lg font-semibold text-pink-400">+{totalStats.hp}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">SP</span>
                <p className="text-lg font-semibold text-purple-400">+{totalStats.sp}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Character Silhouette with Equipment Slots */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-cyan-400">Equipment Slots</h2>
            
            {/* Character Silhouette with Body Slots */}
            <div className="relative mx-auto aspect-[612/612] w-full max-w-md">
              <Image
                src="/character-silhouette.png"
                alt="Character silhouette"
                fill
                className="object-contain"
                priority
              />
              
              {/* Body Slots Overlay */}
              {bodySlots.map((slot) => {
                const item = getEquippedItem(slot);
                const isSelected = selectedSlot === slot;
                const position = slotPositions[slot];
                return (
                  <div
                    key={slot}
                    className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                      isSelected
                        ? "z-10 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ top: position.top, left: position.left }}
                    onClick={() => setSelectedSlot(isSelected ? null : slot)}
                  >
                    <div
                      className={`relative flex h-16 w-16 items-center justify-center rounded-lg border-2 transition ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/20 shadow-lg shadow-cyan-500/50"
                          : item
                            ? "border-green-500 bg-green-500/20 hover:border-green-400"
                            : "border-slate-600 bg-slate-800/60 hover:border-slate-500"
                      }`}
                    >
                      {item ? (
                        <>
                          <span className="text-xs font-semibold text-green-400">✓</span>
                          {/* Unequip button on hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              unequipMutation.mutate({ fromSlot: slot });
                            }}
                            disabled={unequipMutation.isPending}
                            className="absolute right-0 top-0 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500/80 text-[10px] text-white transition hover:bg-red-500 disabled:opacity-50 group-hover:flex"
                            title="Unequip"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">+</span>
                      )}
                      {/* Tooltip on hover */}
                      {item && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow-lg group-hover:block">
                          <div className="font-semibold">{item.name}</div>
                          <div className="mt-1 flex gap-1">
                            {item.vitalityBonus > 0 && (
                              <span className="text-green-400">V+{item.vitalityBonus}</span>
                            )}
                            {item.strengthBonus > 0 && (
                              <span className="text-red-400">S+{item.strengthBonus}</span>
                            )}
                            {item.speedBonus > 0 && (
                              <span className="text-yellow-400">Sp+{item.speedBonus}</span>
                            )}
                            {item.dexterityBonus > 0 && (
                              <span className="text-blue-400">D+{item.dexterityBonus}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-xs text-slate-300">
                      {slotLabels[slot]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Accessory Slots at Bottom */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-400">Accessories</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {accessorySlots.map((slot) => {
                  const item = getEquippedItem(slot);
                  const isSelected = selectedSlot === slot;
                  return (
                    <div
                      key={slot}
                      className={`rounded-xl border p-3 transition ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-slate-300">{slotLabels[slot]}</h3>
                        <button
                          onClick={() => setSelectedSlot(isSelected ? null : slot)}
                          className={`rounded px-2 py-0.5 text-xs transition ${
                            isSelected
                              ? "bg-cyan-500/20 text-cyan-400"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          }`}
                        >
                          {isSelected ? "✓" : "○"}
                        </button>
                      </div>
                      {item ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-100 truncate">{item.name}</p>
                          <div className="flex flex-wrap gap-0.5">
                            {item.vitalityBonus > 0 && (
                              <span className="rounded bg-green-500/20 px-1 py-0.5 text-[10px] text-green-400">
                                V+{item.vitalityBonus}
                              </span>
                            )}
                            {item.strengthBonus > 0 && (
                              <span className="rounded bg-red-500/20 px-1 py-0.5 text-[10px] text-red-400">
                                S+{item.strengthBonus}
                              </span>
                            )}
                            {item.speedBonus > 0 && (
                              <span className="rounded bg-yellow-500/20 px-1 py-0.5 text-[10px] text-yellow-400">
                                Sp+{item.speedBonus}
                              </span>
                            )}
                            {item.dexterityBonus > 0 && (
                              <span className="rounded bg-blue-500/20 px-1 py-0.5 text-[10px] text-blue-400">
                                D+{item.dexterityBonus}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (slot === "RING") {
                                unequipMutation.mutate({
                                  fromSlot: slot,
                                  ringIndex: getRingSlotIndex(),
                                });
                              } else {
                                unequipMutation.mutate({ fromSlot: slot });
                              }
                            }}
                            disabled={unequipMutation.isPending}
                            className="mt-1 w-full rounded bg-red-500/20 px-2 py-1 text-[10px] text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
                          >
                            Unequip
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500">Empty</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Inventory Panel */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-cyan-400">
              {selectedSlot ? `Equippable Items - ${slotLabels[selectedSlot]}` : "Select a slot to view items"}
            </h2>
            {selectedSlot && (
              <>
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                {itemsLoading ? (
                  <p className="text-slate-400">Loading items...</p>
                ) : filteredItems.length > 0 ? (
                  <div className="max-h-[600px] space-y-2 overflow-y-auto">
                    {filteredItems.map((group) => {
                      const firstInvItem = group.inventoryItems[0];
                      if (!firstInvItem) return null;
                      return (
                        <div
                          key={group.item.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-100">{group.item.name}</h3>
                              {group.item.description && (
                                <p className="mt-1 text-xs text-slate-400">{group.item.description}</p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-1">
                                {group.item.vitalityBonus > 0 && (
                                  <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-xs text-green-400">
                                    VIT +{group.item.vitalityBonus}
                                  </span>
                                )}
                                {group.item.strengthBonus > 0 && (
                                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
                                    STR +{group.item.strengthBonus}
                                  </span>
                                )}
                                {group.item.speedBonus > 0 && (
                                  <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">
                                    SPD +{group.item.speedBonus}
                                  </span>
                                )}
                                {group.item.dexterityBonus > 0 && (
                                  <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
                                    DEX +{group.item.dexterityBonus}
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                Quantity: {group.totalQuantity}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                equipMutation.mutate({
                                  inventoryItemId: firstInvItem.id,
                                  toSlot: selectedSlot,
                                });
                              }}
                              disabled={equipMutation.isPending}
                              className="ml-4 rounded bg-cyan-500/20 px-4 py-2 text-sm text-cyan-400 transition hover:bg-cyan-500/30 disabled:opacity-50"
                            >
                              Equip
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
                    <p className="text-slate-400">No equippable items found for this slot</p>
                  </div>
                )}
              </>
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
