"use client";

import { api } from "~/trpc/react";
import { TileCell } from "./tile-cell";

export function MapGrid() {
  const { data: world, isLoading: worldLoading } =
    api.world.getActiveWorld.useQuery();
  const { data: position } = api.player.getPosition.useQuery();

  // Only show loading on initial world load
  if (worldLoading && !world) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-400">Loading map...</p>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-red-400">Failed to load world</p>
      </div>
    );
  }

  // Create a map of tiles by coordinates for quick lookup
  const tileMap = new Map<string, typeof world.tiles[0]>();
  world.tiles.forEach((tile) => {
    tileMap.set(`${tile.x},${tile.y}`, tile);
  });

  const playerX = position?.tileX ?? 10;
  const playerY = position?.tileY ?? 10;

  return (
    <div className="overflow-auto rounded-lg border border-slate-700 bg-slate-800/50 max-h-[600px]">
      <div
        className="inline-grid gap-0 p-2"
        style={{
          gridTemplateColumns: `repeat(${world.width}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: world.height }, (_, y) =>
          Array.from({ length: world.width }, (_, x) => {
            const tile = tileMap.get(`${x},${y}`);
            const isPlayerHere = x === playerX && y === playerY;

            return (
              <TileCell
                key={`${x}-${y}`}
                tile={tile}
                x={x}
                y={y}
                isPlayerHere={isPlayerHere}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
