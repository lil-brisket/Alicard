type Item = {
  vitalityBonus?: number;
  strengthBonus?: number;
  speedBonus?: number;
  dexterityBonus?: number;
  hpBonus?: number;
  spBonus?: number;
  stats?: Record<string, number>;
};

export function getBonus(item: Item | null | undefined, statName: string): number {
  if (!item) return 0;

  // If stats object exists (future JSON-based stats), use that
  if (item.stats && typeof item.stats === "object") {
    return item.stats[statName.toLowerCase()] ?? 0;
  }

  // Otherwise use the current field-based approach
  const statMap: Record<string, keyof Item> = {
    vitality: "vitalityBonus",
    vit: "vitalityBonus",
    strength: "strengthBonus",
    str: "strengthBonus",
    speed: "speedBonus",
    spd: "speedBonus",
    dexterity: "dexterityBonus",
    dex: "dexterityBonus",
    hp: "hpBonus",
    sp: "spBonus",
  };

  const field = statMap[statName.toLowerCase()];
  if (!field) return 0;

  const value = item[field];
  return typeof value === "number" ? value : 0;
}
