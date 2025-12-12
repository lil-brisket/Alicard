type Item = {
  vitalityBonus?: number;
  strengthBonus?: number;
  speedBonus?: number;
  dexterityBonus?: number;
  hpBonus?: number;
  spBonus?: number;
};

type StatBadgesProps = {
  item: Item;
  size?: "xs" | "sm";
  showLabels?: boolean;
};

export function StatBadges({ item, size = "xs", showLabels = false }: StatBadgesProps) {
  const badges: Array<{ label: string; value: number; color: string; shortLabel: string }> = [];

  if (item.vitalityBonus && item.vitalityBonus > 0) {
    badges.push({
      label: "Vitality",
      value: item.vitalityBonus,
      color: "green",
      shortLabel: "VIT",
    });
  }
  if (item.strengthBonus && item.strengthBonus > 0) {
    badges.push({
      label: "Strength",
      value: item.strengthBonus,
      color: "red",
      shortLabel: "STR",
    });
  }
  if (item.speedBonus && item.speedBonus > 0) {
    badges.push({
      label: "Speed",
      value: item.speedBonus,
      color: "yellow",
      shortLabel: "SPD",
    });
  }
  if (item.dexterityBonus && item.dexterityBonus > 0) {
    badges.push({
      label: "Dexterity",
      value: item.dexterityBonus,
      color: "blue",
      shortLabel: "DEX",
    });
  }
  if (item.hpBonus && item.hpBonus > 0) {
    badges.push({
      label: "HP",
      value: item.hpBonus,
      color: "pink",
      shortLabel: "HP",
    });
  }
  if (item.spBonus && item.spBonus > 0) {
    badges.push({
      label: "SP",
      value: item.spBonus,
      color: "purple",
      shortLabel: "SP",
    });
  }

  if (badges.length === 0) return null;

  const sizeClasses = {
    xs: "text-[10px] px-1 py-0.5",
    sm: "text-xs px-1.5 py-0.5",
  };

  const colorClasses = {
    green: "bg-green-500/20 text-green-400",
    red: "bg-red-500/20 text-red-400",
    yellow: "bg-yellow-500/20 text-yellow-400",
    blue: "bg-blue-500/20 text-blue-400",
    pink: "bg-pink-500/20 text-pink-400",
    purple: "bg-purple-500/20 text-purple-400",
  };

  return (
    <div className="flex flex-wrap gap-0.5">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`rounded ${sizeClasses[size]} ${colorClasses[badge.color as keyof typeof colorClasses]}`}
          title={showLabels ? undefined : `${badge.label} +${badge.value}`}
        >
          {showLabels ? `${badge.shortLabel} +${badge.value}` : `${badge.shortLabel[0]}+${badge.value}`}
        </span>
      ))}
    </div>
  );
}
