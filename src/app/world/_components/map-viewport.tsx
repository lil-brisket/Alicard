"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import { type ViewportTile } from "~/lib/types/world-map";

function tileClass(t: ViewportTile["type"]) {
  switch (t) {
    case "grass":
      return "bg-emerald-600";
    case "forest":
      return "bg-emerald-800";
    case "water":
      return "bg-sky-600";
    case "road":
      return "bg-amber-700";
    case "town":
      return "bg-slate-500";
    case "mountain":
      return "bg-stone-600";
    case "fog":
      return "bg-slate-900";
  }
}

export function MapViewport() {
  const utils = api.useUtils();
  const [heldDirection, setHeldDirection] = useState<
    "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW" | null
  >(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get the default world ID (you may want to make this configurable)
  const worldId = "default-world";
  
  const { data: viewport, isLoading, error } = api.world.getViewport.useQuery({
    mapId: worldId,
  });

  const moveMutation = api.world.move.useMutation({
    onSuccess: (newViewport) => {
      // Update the viewport with the server response
      utils.world.getViewport.setData({ mapId: worldId }, newViewport);
      // Also invalidate to ensure fresh data on next load
      void utils.world.getViewport.invalidate({ mapId: worldId });
    },
  });

  const handleMove = useCallback(
    (dir: "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW") => {
      if (moveMutation.isPending) return;
      moveMutation.mutate({ dir });
    },
    [moveMutation]
  );

  // Get direction from pressed keys (supports diagonal movement)
  const getDirectionFromKeys = useCallback((): "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW" | null => {
    const keys = Array.from(pressedKeys);
    const hasW = keys.includes("w") || keys.includes("ArrowUp");
    const hasS = keys.includes("s") || keys.includes("ArrowDown");
    const hasA = keys.includes("a") || keys.includes("ArrowLeft");
    const hasD = keys.includes("d") || keys.includes("ArrowRight");

    // Diagonal movements (check combinations first)
    if (hasW && hasD) return "NE";
    if (hasW && hasA) return "NW";
    if (hasS && hasD) return "SE";
    if (hasS && hasA) return "SW";

    // Cardinal movements
    if (hasW) return "N";
    if (hasS) return "S";
    if (hasA) return "W";
    if (hasD) return "E";

    return null;
  }, [pressedKeys]);

  // Handle keyboard events for WASD and arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const validKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

      if (validKeys.includes(key)) {
        e.preventDefault();
        setPressedKeys((prev) => {
          const next = new Set(prev);
          // Normalize arrow keys and WASD
          if (e.key === "ArrowUp" || key === "w") {
            next.add("w");
            next.add("ArrowUp");
          }
          if (e.key === "ArrowDown" || key === "s") {
            next.add("s");
            next.add("ArrowDown");
          }
          if (e.key === "ArrowLeft" || key === "a") {
            next.add("a");
            next.add("ArrowLeft");
          }
          if (e.key === "ArrowRight" || key === "d") {
            next.add("d");
            next.add("ArrowRight");
          }
          return next;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const validKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

      if (validKeys.includes(key)) {
        e.preventDefault();
        setPressedKeys((prev) => {
          const next = new Set(prev);
          // Remove both arrow key and WASD equivalent
          if (e.key === "ArrowUp" || key === "w") {
            next.delete("w");
            next.delete("ArrowUp");
          }
          if (e.key === "ArrowDown" || key === "s") {
            next.delete("s");
            next.delete("ArrowDown");
          }
          if (e.key === "ArrowLeft" || key === "a") {
            next.delete("a");
            next.delete("ArrowLeft");
          }
          if (e.key === "ArrowRight" || key === "d") {
            next.delete("d");
            next.delete("ArrowRight");
          }
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Handle continuous movement (from keyboard or buttons)
  useEffect(() => {
    // Keyboard keys take priority over button holds
    const keyboardDirection = getDirectionFromKeys();
    const activeDirection = keyboardDirection ?? heldDirection;

    if (activeDirection && !moveMutation.isPending) {
      // Initial move
      handleMove(activeDirection);

      // Set up interval for continuous movement
      intervalRef.current = setInterval(() => {
        const currentKeyboardDirection = getDirectionFromKeys();
        const currentActiveDirection = currentKeyboardDirection ?? heldDirection;
        if (currentActiveDirection && !moveMutation.isPending) {
          handleMove(currentActiveDirection);
        }
      }, 200); // Move every 200ms while active
    } else {
      // Clear interval when no direction is active
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pressedKeys, heldDirection, moveMutation.isPending, handleMove, getDirectionFromKeys]);

  const handleButtonDown = (dir: "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW") => {
    setHeldDirection(dir);
  };

  const handleButtonUp = () => {
    setHeldDirection(null);
  };

  // Find player position from viewport
  const playerTile = viewport?.tiles.find((t) => t.isPlayer);
  const playerX = playerTile?.x ?? 0;
  const playerY = playerTile?.y ?? 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center sm:min-h-[520px]">
        <p className="text-slate-400">Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[320px] items-center justify-center sm:min-h-[520px]">
        <div className="text-center">
          <p className="text-red-400 mb-2">Error loading map</p>
          <p className="text-sm text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!viewport) {
    return (
      <div className="flex min-h-[320px] items-center justify-center sm:min-h-[520px]">
        <p className="text-slate-400">No map data available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Coordinates display */}
      <div className="mx-auto mb-2 w-full max-w-[520px] text-center">
        <div className="inline-block rounded-lg border border-white/10 bg-white/5 px-4 py-2">
          <span className="text-sm font-semibold text-slate-300">
            Position: <span className="text-cyan-400">{playerX}, {playerY}</span>
          </span>
        </div>
      </div>

      {/* Map frame */}
      <div className="mx-auto w-full max-w-[520px] rounded-2xl border border-white/10 bg-white/5 p-2 shadow-xl sm:p-3">
        <div className="grid aspect-square w-full select-none grid-cols-7 gap-0.5 sm:gap-1">
          {viewport.tiles.map((t) => (
            <div
              key={`${t.x},${t.y}`}
              className={[
                "relative rounded-sm transition-transform duration-150 ease-out sm:rounded-md",
                tileClass(t.type),
                t.type === "fog" ? "opacity-90" : "opacity-100",
              ].join(" ")}
            >
              {/* Optional: subtle texture */}
              <div className="absolute inset-0 rounded-sm bg-white/5 sm:rounded-md" />

              {/* Player marker */}
              {t.isPlayer && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)] sm:h-3 sm:w-3 sm:shadow-[0_0_14px_rgba(255,255,255,0.6)]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Movement controls */}
      <div className="mx-auto mt-4 w-full max-w-[520px] rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {/* Top row */}
          <button
            className="min-h-[44px] rounded-xl bg-sky-700/80 px-2 py-2 text-xs font-semibold hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed sm:px-3 sm:text-sm"
            onMouseDown={() => handleButtonDown("NW")}
            onMouseUp={handleButtonUp}
            onMouseLeave={handleButtonUp}
            onTouchStart={() => handleButtonDown("NW")}
            onTouchEnd={handleButtonUp}
            disabled={moveMutation.isPending}
          >
            NW
          </button>
          <button
            className="min-h-[44px] rounded-xl bg-sky-600/80 px-2 py-2 text-xs font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed sm:px-3 sm:text-sm md:text-base"
            onMouseDown={() => handleButtonDown("N")}
            onMouseUp={handleButtonUp}
            onMouseLeave={handleButtonUp}
            onTouchStart={() => handleButtonDown("N")}
            onTouchEnd={handleButtonUp}
            disabled={moveMutation.isPending}
          >
            North
          </button>
          <button
            className="min-h-[44px] rounded-xl bg-sky-700/80 px-2 py-2 text-xs font-semibold hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed sm:px-3 sm:text-sm"
            onMouseDown={() => handleButtonDown("NE")}
            onMouseUp={handleButtonUp}
            onMouseLeave={handleButtonUp}
            onTouchStart={() => handleButtonDown("NE")}
            onTouchEnd={handleButtonUp}
            disabled={moveMutation.isPending}
          >
            NE
          </button>
          {/* Middle row */}
          <button
            className="min-h-[44px] rounded-xl bg-sky-600/80 px-2 py-2 text-xs font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed sm:px-3 sm:text-sm md:text-base"
            onMouseDown={() => handleButtonDown("W")}
            onMouseUp={handleButtonUp}
            onMouseLeave={handleButtonUp}
            onTouchStart={() => handleButtonDown("W")}
            onTouchEnd={handleButtonUp}
            disabled={moveMutation.isPending}
          >
            West
          </button>
          <div />
          <button
            className="min-h-[44px] rounded-xl bg-sky-600/80 px-2 py-2 text-xs font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed sm:px-3 sm:text-sm md:text-base"
            onMouseDown={() => handleButtonDown("E")}
            onMouseUp={handleButtonUp}
            onMouseLeave={handleButtonUp}
            onTouchStart={() => handleButtonDown("E")}
            onTouchEnd={handleButtonUp}
            disabled={moveMutation.isPending}
          >
            East
          </button>
          {/* Bottom row */}
          <button
            className="min-h-[44px] rounded-xl bg-sky-700/80 px-2 py-2 text-xs font-semibold hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed sm:px-3 sm:text-sm"
            onMouseDown={() => handleButtonDown("SW")}
            onMouseUp={handleButtonUp}
            onMouseLeave={handleButtonUp}
            onTouchStart={() => handleButtonDown("SW")}
            onTouchEnd={handleButtonUp}
            disabled={moveMutation.isPending}
          >
            SW
          </button>
          <button
            className="min-h-[44px] rounded-xl bg-sky-600/80 px-2 py-2 text-xs font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed sm:px-3 sm:text-sm md:text-base"
            onMouseDown={() => handleButtonDown("S")}
            onMouseUp={handleButtonUp}
            onMouseLeave={handleButtonUp}
            onTouchStart={() => handleButtonDown("S")}
            onTouchEnd={handleButtonUp}
            disabled={moveMutation.isPending}
          >
            South
          </button>
          <button
            className="min-h-[44px] rounded-xl bg-sky-700/80 px-2 py-2 text-xs font-semibold hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed sm:px-3 sm:text-sm"
            onMouseDown={() => handleButtonDown("SE")}
            onMouseUp={handleButtonUp}
            onMouseLeave={handleButtonUp}
            onTouchStart={() => handleButtonDown("SE")}
            onTouchEnd={handleButtonUp}
            disabled={moveMutation.isPending}
          >
            SE
          </button>
        </div>
      </div>
    </div>
  );
}

