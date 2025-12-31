export type TileType =
  | "grass"
  | "forest"
  | "water"
  | "road"
  | "town"
  | "mountain";

export type WorldMap = {
  id: string;
  width: number;
  height: number;
  tiles: TileType[]; // length = width * height, row-major
};

export const idx = (x: number, y: number, width: number) => y * width + x;

export type ViewportTile = {
  x: number;
  y: number;
  type: TileType | "fog";
  isPlayer: boolean;
};

export function getViewport(params: {
  map: WorldMap;
  playerX: number;
  playerY: number;
  discovered: boolean[]; // length = map.width*map.height
  radius?: number; // 3 -> 7x7
}): { tiles: ViewportTile[]; topLeftX: number; topLeftY: number } {
  const { map, playerX, playerY, discovered } = params;
  const radius = params.radius ?? 3;

  const viewSize = radius * 2 + 1;

  // Center on player, clamp so viewport stays inside map bounds
  const topLeftX = Math.max(0, Math.min(playerX - radius, map.width - viewSize));
  const topLeftY = Math.max(0, Math.min(playerY - radius, map.height - viewSize));

  const tiles: ViewportTile[] = [];

  for (let vy = 0; vy < viewSize; vy++) {
    for (let vx = 0; vx < viewSize; vx++) {
      const x = topLeftX + vx;
      const y = topLeftY + vy;

      const i = idx(x, y, map.width);
      const seen = discovered[i];

      tiles.push({
        x,
        y,
        type: seen ? map.tiles[i] : "fog",
        isPlayer: x === playerX && y === playerY,
      });
    }
  }

  return { tiles, topLeftX, topLeftY };
}

