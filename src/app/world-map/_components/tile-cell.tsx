"use client";

type TileCellProps = {
  tile?: {
    tileType: string;
    description?: string | null;
  } | null;
  x: number;
  y: number;
  isPlayerHere: boolean;
};

const tileTypeColors: Record<string, string> = {
  PLAIN: "bg-green-600",
  GRASS: "bg-green-500",
  ROAD: "bg-amber-700",
  FOREST: "bg-green-800",
  WATER: "bg-blue-500",
  RIVER: "bg-blue-400",
  TOWN: "bg-gray-600",
  MOUNTAIN: "bg-gray-500",
  DESERT: "bg-yellow-600",
  DUNGEON: "bg-purple-900",
  SHRINE: "bg-purple-600",
};

const tileTypeIcons: Record<string, string> = {
  PLAIN: "🌾",
  GRASS: "🌱",
  ROAD: "🛤️",
  FOREST: "🌲",
  WATER: "💧",
  RIVER: "🌊",
  TOWN: "🏘️",
  MOUNTAIN: "⛰️",
  DESERT: "🏜️",
  DUNGEON: "🏰",
  SHRINE: "⛩️",
};

export function TileCell({ tile, x, y, isPlayerHere }: TileCellProps) {
  const tileType = tile?.tileType ?? "PLAIN";
  const bgColor = tileTypeColors[tileType] ?? "bg-gray-700";
  const icon = tileTypeIcons[tileType] ?? "❓";

  return (
    <div
      className={`relative flex h-7 w-7 items-center justify-center border border-slate-600 text-xs transition hover:border-cyan-400 hover:z-10 ${
        isPlayerHere ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-800" : ""
      } ${bgColor}`}
      title={tile?.description ?? `${tileType} at (${x}, ${y})`}
    >
      {isPlayerHere ? (
        <span className="text-lg" title="You are here">
          👤
        </span>
      ) : (
        <span className="text-xs">{icon}</span>
      )}
    </div>
  );
}
