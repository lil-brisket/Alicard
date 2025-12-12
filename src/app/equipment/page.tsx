"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import toast from "react-hot-toast";
import Image from "next/image";
import { StatBadges } from "./_components/stat-badges";
import { getBonus } from "./_components/item-bonus-helper";

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

const bodySlots: EquipmentSlot[] = ["HEAD", "LEFT_ARM", "RIGHT_ARM", "BODY", "LEGS", "FEET"];
const accessorySlots: EquipmentSlot[] = ["RING1", "RING2", "RING3", "NECKLACE", "BELT", "CLOAK"];

// Position coordinates for body slots (percentage-based for responsiveness)
const slotPositions: Record<EquipmentSlot, { top: string; left: string }> = {
  HEAD: { top: "5%", left: "50%" },
  LEFT_ARM: { top: "25%", left: "15%" },
  RIGHT_ARM: { top: "25%", left: "85%" },
  BODY: { top: "35%", left: "50%" },
  LEGS: { top: "65%", left: "50%" },
  FEET: { top: "90%", left: "50%" },
  RING1: { top: "0", left: "0" }, // Not used for body positioning
  RING2: { top: "0", left: "0" },
  RING3: { top: "0", left: "0" },
  NECKLACE: { top: "0", left: "0" },
  BELT: { top: "0", left: "0" },
  CLOAK: { top: "0", left: "0" },
};

export default function EquipmentPage() {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingInventoryItemId, setPendingInventoryItemId] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<EquipmentSlot | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<EquipmentSlot | null>(null);

  const utils = api.useUtils();
  const { data: loadout, isLoading: loadoutLoading, refetch: refetchLoadout } = api.equipment.getLoadout.useQuery();
  const { data: equippableItems, isLoading: itemsLoading } = api.equipment.getEquippableInventory.useQuery(
    { slot: selectedSlot ?? undefined },
    { enabled: !!selectedSlot }
  );

  const equipMutation = api.equipment.equipItem.useMutation({
    onSuccess: () => {
      toast.success("Item equipped!");
      void refetchLoadout();
      void utils.equipment.getEquippableInventory.invalidate();
      setPendingInventoryItemId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to equip item");
      setPendingInventoryItemId(null);
    },
  });

  const unequipMutation = api.equipment.unequip.useMutation({
    onSuccess: () => {
      toast.success("Item unequipped!");
      void refetchLoadout();
      void utils.equipment.getEquippableInventory.invalidate();
      setPendingSlot(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to unequip item");
      setPendingSlot(null);
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

  const handleSlotClick = (slot: EquipmentSlot) => {
    if (selectedSlot === slot) {
      setSelectedSlot(null);
      setExpandedSlot(null);
    } else {
      setSelectedSlot(slot);
      setExpandedSlot(null);
    }
  };

  const handleSlotKeyDown = (e: React.KeyboardEvent, slot: EquipmentSlot) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSlotClick(slot);
    }
  };

  const handleItemClick = (slot: EquipmentSlot) => {
    if (expandedSlot === slot) {
      setExpandedSlot(null);
    } else {
      setExpandedSlot(slot);
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, slot: EquipmentSlot) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleItemClick(slot);
    }
  };

  // Enhanced filtering: search by name, description, and stat shorthand
  const filteredItems = equippableItems?.filter((group) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    // Search in name
    if (group.item.name.toLowerCase().includes(query)) return true;
    
    // Search in description
    if (group.item.description?.toLowerCase().includes(query)) return true;
    
    // Search in stat shorthand (str, vit, dex, spd, etc.)
    const statTerms: Record<string, string[]> = {
      str: ["strength", "str"],
      vit: ["vitality", "vit"],
      dex: ["dexterity", "dex"],
      spd: ["speed", "spd"],
      hp: ["hp", "health"],
      sp: ["sp", "stamina"],
    };
    
    for (const [key, terms] of Object.entries(statTerms)) {
      if (query.includes(key) || terms.some(term => query.includes(term))) {
        const bonus = getBonus(group.item, key);
        if (bonus > 0) return true;
      }
    }
    
    return false;
  }) ?? [];

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
                const isExpanded = expandedSlot === slot;
                const isPending = pendingSlot === slot;
                const position = slotPositions[slot];
                return (
                  <div
                    key={slot}
                    className={`group absolute -translate-x-1/2 -translate-y-1/2 transition-all ${
                      isSelected
                        ? "z-10 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ top: position.top, left: position.left }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`${slotLabels[slot]} slot${item ? `, equipped: ${item.name}` : ", empty"}`}
                      className={`relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 transition ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/20 shadow-lg shadow-cyan-500/50"
                          : item
                            ? "border-green-500 bg-green-500/20 hover:border-green-400"
                            : "border-slate-600 bg-slate-800/60 hover:border-slate-500"
                      }`}
                      onClick={() => handleSlotClick(slot)}
                      onKeyDown={(e) => handleSlotKeyDown(e, slot)}
                    >
                      {item ? (
                        <>
                          <span className="text-xs font-semibold text-green-400">✓</span>
                          {/* Unequip button on hover/desktop */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingSlot(slot);
                              unequipMutation.mutate({ fromSlot: slot });
                            }}
                            disabled={isPending}
                            className="absolute right-0 top-0 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500/80 text-[10px] text-white transition hover:bg-red-500 disabled:opacity-50 group-hover:flex"
                            title="Unequip"
                          >
                            {isPending ? "..." : "×"}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">+</span>
                      )}
                      {/* Tooltip on hover (desktop) */}
                      {item && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow-lg group-hover:block">
                          <div className="font-semibold">{item.name}</div>
                          <StatBadges item={item} size="xs" />
                        </div>
                      )}
                    </div>
                    {/* Mobile/Expanded detail panel */}
                    {isExpanded && item && (
                      <div className="absolute left-1/2 top-full z-20 mt-2 w-48 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-100 shadow-lg">
                        <div className="font-semibold mb-1">Equipped: {item.name}</div>
                        {item.description && (
                          <div className="mb-2 text-slate-400">{item.description}</div>
                        )}
                        <div className="mb-2">
                          <StatBadges item={item} size="xs" showLabels />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingSlot(slot);
                            unequipMutation.mutate({ fromSlot: slot });
                          }}
                          disabled={isPending}
                          className="w-full rounded bg-red-500/20 px-2 py-1 text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {isPending ? "Unequipping..." : "Unequip"}
                        </button>
                      </div>
                    )}
                    <div 
                      className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-xs text-slate-300 cursor-pointer"
                      onClick={() => handleItemClick(slot)}
                      onKeyDown={(e) => handleItemKeyDown(e, slot)}
                      role="button"
                      tabIndex={0}
                    >
                      {slotLabels[slot]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Accessory Slots at Bottom */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-400">Accessories</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {accessorySlots.map((slot) => {
                  const item = getEquippedItem(slot);
                  const isSelected = selectedSlot === slot;
                  const isExpanded = expandedSlot === slot;
                  const isPending = pendingSlot === slot;
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
                        <div
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`Select ${slotLabels[slot]} slot`}
                          onClick={() => handleSlotClick(slot)}
                          onKeyDown={(e) => handleSlotKeyDown(e, slot)}
                          className={`cursor-pointer rounded px-2 py-0.5 text-xs transition ${
                            isSelected
                              ? "bg-cyan-500/20 text-cyan-400"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          }`}
                        >
                          {isSelected ? "✓" : "○"}
                        </div>
                      </div>
                      {item ? (
                        <div className="space-y-1">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleItemClick(slot)}
                            onKeyDown={(e) => handleItemKeyDown(e, slot)}
                            className="cursor-pointer"
                          >
                            <p className="text-xs font-medium text-slate-100 truncate">{item.name}</p>
                            <StatBadges item={item} size="xs" />
                          </div>
                          {/* Mobile/Expanded detail panel */}
                          {isExpanded && (
                            <div className="mt-2 rounded border border-slate-700 bg-slate-900 p-2 text-xs text-slate-100">
                              {item.description && (
                                <div className="mb-2 text-slate-400">{item.description}</div>
                              )}
                              <div className="mb-2">
                                <StatBadges item={item} size="xs" showLabels />
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setPendingSlot(slot);
                              unequipMutation.mutate({ fromSlot: slot });
                            }}
                            disabled={isPending}
                            className="mt-1 w-full rounded bg-red-500/20 px-2 py-1 text-[10px] text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
                          >
                            {isPending ? "Unequipping..." : "Unequip"}
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
            <div>
              <h2 className="text-xl font-semibold text-cyan-400">
                {selectedSlot ? `Equippable Items - ${slotLabels[selectedSlot]}` : "Select a slot to view items"}
              </h2>
              {selectedSlot && (
                <p className="mt-1 text-sm text-slate-400">
                  Selected slot: <span className="font-semibold text-cyan-400">{slotLabels[selectedSlot]}</span> (click again to clear)
                </p>
              )}
            </div>
            {selectedSlot ? (
              <>
                <div>
                  <p className="mb-2 text-sm text-slate-400">
                    Only items that fit this slot appear on the right.
                  </p>
                  <input
                    type="text"
                    placeholder="Search items (name, description, or stat: str, vit, dex, spd)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                {itemsLoading ? (
                  <p className="text-slate-400">Loading items...</p>
                ) : filteredItems.length > 0 ? (
                  <div className="max-h-[600px] space-y-2 overflow-y-auto">
                    {filteredItems.map((group) => {
                      const firstInvItem = group.inventoryItems[0];
                      if (!firstInvItem) return null;
                      const isPending = pendingInventoryItemId === firstInvItem.id;
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
                              <div className="mt-2">
                                <StatBadges item={group.item} size="sm" showLabels />
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                Quantity: {group.totalQuantity}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setPendingInventoryItemId(firstInvItem.id);
                                equipMutation.mutate({
                                  inventoryItemId: firstInvItem.id,
                                  toSlot: selectedSlot,
                                });
                              }}
                              disabled={isPending || equipMutation.isPending}
                              className="ml-4 flex items-center gap-2 rounded bg-cyan-500/20 px-4 py-2 text-sm text-cyan-400 transition hover:bg-cyan-500/30 disabled:opacity-50"
                            >
                              {isPending && (
                                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              )}
                              {isPending ? "Equipping..." : "Equip"}
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
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
                <p className="text-slate-400">Pick a slot on the character to view equippable items.</p>
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
