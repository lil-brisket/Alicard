"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import toast from "react-hot-toast";

type EquipmentSlot = "HEAD" | "LEFT_ARM" | "RIGHT_ARM" | "BODY" | "LEGS" | "FEET" | "RING1" | "RING2" | "RING3" | "NECKLACE" | "BELT" | "CLOAK";

const slotLabels: Record<EquipmentSlot, string> = {
  HEAD: "Head",
  LEFT_ARM: "Left Arm",
  RIGHT_ARM: "Right Arm",
  BODY: "Body",
  LEGS: "Legs",
  FEET: "Feet",
  RING1: "Ring 1",
  RING2: "Ring 2",
  RING3: "Ring 3",
  NECKLACE: "Necklace",
  BELT: "Belt",
  CLOAK: "Cloak",
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

  const slots: EquipmentSlot[] = ["HEAD", "LEFT_ARM", "RIGHT_ARM", "BODY", "LEGS", "FEET", "RING1", "RING2", "RING3", "NECKLACE", "BELT", "CLOAK"];

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
      case "RING1":
        return equipment.ring1;
      case "RING2":
        return equipment.ring2;
      case "RING3":
        return equipment.ring3;
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
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
              <div>
                <span className="text-xs text-slate-400">Defense</span>
                <p className="text-lg font-semibold text-cyan-400">+{totalStats.defense}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Equipment Slots */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-cyan-400">Equipment Slots</h2>
            <div className="grid grid-cols-2 gap-3">
              {slots.map((slot) => {
                const item = getEquippedItem(slot);
                const isSelected = selectedSlot === slot;
                return (
                  <div
                    key={slot}
                    className={`rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-300">{slotLabels[slot]}</h3>
                      <button
                        onClick={() => setSelectedSlot(isSelected ? null : slot)}
                        className={`rounded px-2 py-1 text-xs transition ${
                          isSelected
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                    {item ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-100">{item.name}</p>
                        <div className="flex flex-wrap gap-1">
                          {item.vitalityBonus > 0 && (
                            <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-xs text-green-400">
                              VIT +{item.vitalityBonus}
                            </span>
                          )}
                          {item.strengthBonus > 0 && (
                            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
                              STR +{item.strengthBonus}
                            </span>
                          )}
                          {item.speedBonus > 0 && (
                            <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">
                              SPD +{item.speedBonus}
                            </span>
                          )}
                          {item.dexterityBonus > 0 && (
                            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
                              DEX +{item.dexterityBonus}
                            </span>
                          )}
                          {item.hpBonus > 0 && (
                            <span className="rounded bg-pink-500/20 px-1.5 py-0.5 text-xs text-pink-400">
                              HP +{item.hpBonus}
                            </span>
                          )}
                          {item.spBonus > 0 && (
                            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
                              SP +{item.spBonus}
                            </span>
                          )}
                          {item.defenseBonus > 0 && (
                            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-xs text-cyan-400">
                              DEF +{item.defenseBonus}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            unequipMutation.mutate({ fromSlot: slot });
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
                                {group.item.hpBonus > 0 && (
                                  <span className="rounded bg-pink-500/20 px-1.5 py-0.5 text-xs text-pink-400">
                                    HP +{group.item.hpBonus}
                                  </span>
                                )}
                                {group.item.spBonus > 0 && (
                                  <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
                                    SP +{group.item.spBonus}
                                  </span>
                                )}
                                {group.item.defenseBonus > 0 && (
                                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-xs text-cyan-400">
                                    DEF +{group.item.defenseBonus}
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

      </div>
    </div>
  );
}
