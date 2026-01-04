"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { api } from "~/trpc/react";
import { type ViewportTile } from "~/lib/types/world-map";

type Dir = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";

function tileClass(t: ViewportTile["type"]) {
  switch (t) {
    case "grass":
      return "bg-emerald-500";
    case "forest":
      return "bg-emerald-900";
    case "water":
      return "bg-sky-600";
    case "road":
      return "bg-amber-600";
    case "town":
      return "bg-slate-400";
    case "mountain":
      return "bg-stone-700";
    case "fog":
      return "bg-slate-900";
  }
}

function dirToDelta(dir: Dir) {
  switch (dir) {
    case "N":
      return { dx: 0, dy: -1 };
    case "S":
      return { dx: 0, dy: 1 };
    case "E":
      return { dx: 1, dy: 0 };
    case "W":
      return { dx: -1, dy: 0 };
    case "NE":
      return { dx: 1, dy: -1 };
    case "NW":
      return { dx: -1, dy: -1 };
    case "SE":
      return { dx: 1, dy: 1 };
    case "SW":
      return { dx: -1, dy: 1 };
  }
}

export function MapViewport() {
  const utils = api.useUtils();

  // Default world ID (make configurable later)
  const worldId = "default-world";

  const { data: viewport, isLoading, error } = api.world.getViewport.useQuery({
    mapId: worldId,
  });

  // Local display copy (lets us animate immediately without waiting for network)
  const [displayViewport, setDisplayViewport] = useState<typeof viewport | null>(null);

  useEffect(() => {
    if (viewport) setDisplayViewport(viewport);
  }, [viewport]);

  // ---- Input state (normalized to WASD + arrows) ----
  const [heldDirection, setHeldDirection] = useState<Dir | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<"w" | "a" | "s" | "d">>(new Set());

  const getDirectionFromKeys = useCallback((): Dir | null => {
    const hasW = pressedKeys.has("w");
    const hasS = pressedKeys.has("s");
    const hasA = pressedKeys.has("a");
    const hasD = pressedKeys.has("d");

    // Diagonals first
    if (hasW && hasD) return "NE";
    if (hasW && hasA) return "NW";
    if (hasS && hasD) return "SE";
    if (hasS && hasA) return "SW";

    // Cardinals
    if (hasW) return "N";
    if (hasS) return "S";
    if (hasA) return "W";
    if (hasD) return "E";

    return null;
  }, [pressedKeys]);

  // ---- Movement loop state (prevents interval stutter) ----
  const activeDirRef = useRef<Dir | null>(null);
  const nextMoveAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // One-move queue to reduce stalls while holding direction
  const inFlightRef = useRef(false);
  const queuedDirRef = useRef<Dir | null>(null);
  const touchHandledRef = useRef(false);
  const handleMoveRef = useRef<((dir: Dir) => void) | null>(null);

  const MOVE_EVERY_MS = 30; // Ultra-fast movement cadence

  // Keep the active direction ref updated without triggering loop recreation
  useEffect(() => {
    const keyboardDir = getDirectionFromKeys();
    activeDirRef.current = keyboardDir ?? heldDirection;
  }, [heldDirection, pressedKeys, getDirectionFromKeys]);

  // Keyboard listeners (normalized)
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const key = e.key;

      const mapKey = () => {
        if (key === "w" || key === "W" || key === "ArrowUp") return "w";
        if (key === "s" || key === "S" || key === "ArrowDown") return "s";
        if (key === "a" || key === "A" || key === "ArrowLeft") return "a";
        if (key === "d" || key === "D" || key === "ArrowRight") return "d";
        return null;
      };

      const k = mapKey();
      if (!k) return;

      e.preventDefault();
      
      // Check if this is a new key press (not already held)
      const isNewKey = !pressedKeys.has(k);
      
      setPressedKeys((prev) => {
        if (prev.has(k)) return prev;
        const next = new Set(prev);
        next.add(k);
        return next;
      });

      // If it's a new key press and we're not in flight, trigger immediate movement
      if (isNewKey && !inFlightRef.current && handleMoveRef.current) {
        const keyboardDir = (() => {
          const hasW = k === "w" || pressedKeys.has("w");
          const hasS = k === "s" || pressedKeys.has("s");
          const hasA = k === "a" || pressedKeys.has("a");
          const hasD = k === "d" || pressedKeys.has("d");

          // Diagonals first
          if (hasW && hasD) return "NE";
          if (hasW && hasA) return "NW";
          if (hasS && hasD) return "SE";
          if (hasS && hasA) return "SW";

          // Cardinals
          if (hasW) return "N";
          if (hasS) return "S";
          if (hasA) return "W";
          if (hasD) return "E";

          return null;
        })();

        if (keyboardDir) {
          nextMoveAtRef.current = performance.now() + MOVE_EVERY_MS;
          handleMoveRef.current(keyboardDir);
        }
      }
    };

    const onUp = (e: KeyboardEvent) => {
      const key = e.key;

      const mapKey = () => {
        if (key === "w" || key === "W" || key === "ArrowUp") return "w";
        if (key === "s" || key === "S" || key === "ArrowDown") return "s";
        if (key === "a" || key === "A" || key === "ArrowLeft") return "a";
        if (key === "d" || key === "D" || key === "ArrowRight") return "d";
        return null;
      };

      const k = mapKey();
      if (!k) return;

      e.preventDefault();
      setPressedKeys((prev) => {
        if (!prev.has(k)) return prev;
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    };

    window.addEventListener("keydown", onDown, { passive: false });
    window.addEventListener("keyup", onUp, { passive: false });
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Helper to shift tiles optimistically
  const shiftTiles = useCallback((tiles: ViewportTile[], dir: Dir): ViewportTile[] => {
    const { dx, dy } = dirToDelta(dir);
    return tiles.map((t) => ({
      ...t,
      x: t.x - dx,
      y: t.y - dy,
    }));
  }, []);

  // Mutation with reconciliation — NO invalidate-on-success
  const moveMutation = api.world.move.useMutation({
    onMutate: async () => {
      // Cancel any outgoing viewport fetch; we want smooth UX
      await utils.world.getViewport.cancel({ mapId: worldId });

      // Provide rollback data if needed (inFlightRef already set in handleMove)
      const previous = utils.world.getViewport.getData({ mapId: worldId });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback to previous viewport (if we have it)
      if (ctx?.previous) {
        utils.world.getViewport.setData({ mapId: worldId }, ctx.previous);
        setDisplayViewport(ctx.previous);
      }
      // Ensure we stop any queued movement on error
      queuedDirRef.current = null;
      inFlightRef.current = false;
    },
    onSuccess: (newViewport) => {
      // Replace with authoritative viewport
      utils.world.getViewport.setData({ mapId: worldId }, newViewport);
      setDisplayViewport(newViewport);

      // Allow next move
      inFlightRef.current = false;
    },
  });

  const handleMove = useCallback(
    (dir: Dir) => {
      // If server request is in flight, queue ONE move (reduces "stall" feel)
      if (inFlightRef.current || moveMutation.isPending) {
        queuedDirRef.current = dir;
        return;
      }
      // Set in-flight BEFORE mutation to prevent double moves
      inFlightRef.current = true;
      
      // Optimistically update display immediately for instant feedback
      const previous = utils.world.getViewport.getData({ mapId: worldId });
      if (previous) {
        const optimisticViewport = {
          ...previous,
          tiles: shiftTiles(previous.tiles, dir),
        };
        setDisplayViewport(optimisticViewport);
        utils.world.getViewport.setData({ mapId: worldId }, optimisticViewport);
      }
      
      moveMutation.mutate({ dir });
    },
    [moveMutation, shiftTiles, utils, worldId]
  );

  // Keep handleMove ref updated for immediate keyboard response
  useEffect(() => {
    handleMoveRef.current = handleMove;
  }, [handleMove]);

  // Single RAF loop (no intervals, no teardown stutter)
  useEffect(() => {
    const tick = () => {
      const now = performance.now();

      // If we just completed a move and have a queued direction, fire it immediately
      if (!inFlightRef.current && queuedDirRef.current) {
        const q = queuedDirRef.current;
        queuedDirRef.current = null;
        nextMoveAtRef.current = now + MOVE_EVERY_MS;
        handleMove(q);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const dir = activeDirRef.current;

      // Only attempt a new move if:
      // - a direction is held
      // - not already in flight (double-check to prevent race conditions)
      // - timing gate passed (or first move - no gate)
      if (dir && !inFlightRef.current && !moveMutation.isPending && now >= nextMoveAtRef.current) {
        nextMoveAtRef.current = now + MOVE_EVERY_MS;
        handleMove(dir);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    // Initialize timing gate to allow immediate first move
    nextMoveAtRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [handleMove]);

  // Button handlers (single move per press, queue if in flight)
  const handleButtonClick = useCallback(
    (dir: Dir) => {
      // If already in flight, queue the move
      if (inFlightRef.current || moveMutation.isPending) {
        queuedDirRef.current = dir;
        return;
      }
      // Bypass timing gate for immediate button response
      nextMoveAtRef.current = performance.now();
      // Move immediately
      handleMove(dir);
    },
    [handleMove, moveMutation]
  );

  // Use displayViewport for rendering (falls back to query data)
  const vp = displayViewport ?? viewport;

  const playerPos = useMemo(() => {
    const pt = vp?.tiles.find((t) => t.isPlayer);
    return { x: pt?.x ?? 0, y: pt?.y ?? 0 };
  }, [vp?.tiles]);

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
          <p className="mb-2 text-red-400">Error loading map</p>
          <p className="text-sm text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!vp) {
    return (
      <div className="flex min-h-[320px] items-center justify-center sm:min-h-[520px]">
        <p className="text-slate-400">No map data available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Coordinates */}
      <div className="mx-auto mb-2 w-full max-w-[520px] md:max-w-[400px] text-center">
        <div className="inline-block rounded-lg border border-white/10 bg-white/5 px-4 py-2">
          <span className="text-sm font-semibold text-slate-300">
            Position: <span className="text-cyan-400">{playerPos.x}, {playerPos.y}</span>
          </span>
        </div>
      </div>

      {/* Map frame */}
      <div className="mx-auto w-full max-w-[520px] md:max-w-[400px] rounded-2xl border border-white/10 bg-white/5 p-2 shadow-xl sm:p-3">
        <div className="aspect-square w-full overflow-hidden rounded-xl">
          <div className="grid h-full w-full select-none grid-cols-7 gap-0.5 sm:gap-1">
            {vp.tiles.map((t) => (
              <div
                key={`${t.x},${t.y}`}
                className={[
                  "relative rounded-sm sm:rounded-md",
                  "transition-transform duration-150 ease-out md:hover:scale-[1.04]",
                  tileClass(t.type),
                  t.type === "fog" ? "opacity-90" : "opacity-100",
                ].join(" ")}
              >
                <div className="absolute inset-0 rounded-sm bg-white/5 sm:rounded-md" />

                {t.isPlayer && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.85)] sm:h-3 sm:w-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Movement controls */}
      <div className="mx-auto mt-4 w-full max-w-[520px] md:max-w-[400px] rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {/* Top row */}
          <div
            role="button"
            tabIndex={0}
            className="min-h-[44px] rounded-lg bg-white/5 px-2 py-2 text-xs text-slate-300 cursor-pointer select-none touch-manipulation sm:px-3 sm:text-sm"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            onClick={() => {
              if (!touchHandledRef.current) {
                handleButtonClick("NW");
              }
              touchHandledRef.current = false;
            }}
            onTouchStart={(e) => {
              touchHandledRef.current = true;
              handleButtonClick("NW");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleButtonClick("NW");
              }
            }}
          >
            NW
          </div>
          <div
            role="button"
            tabIndex={0}
            className="min-h-[44px] rounded-lg bg-white/5 px-2 py-2 text-xs text-slate-300 cursor-pointer select-none touch-manipulation sm:px-3 sm:text-sm md:text-base"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            onClick={() => {
              if (!touchHandledRef.current) {
                handleButtonClick("N");
              }
              touchHandledRef.current = false;
            }}
            onTouchStart={(e) => {
              touchHandledRef.current = true;
              handleButtonClick("N");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleButtonClick("N");
              }
            }}
          >
            North
          </div>
          <div
            role="button"
            tabIndex={0}
            className="min-h-[44px] rounded-lg bg-white/5 px-2 py-2 text-xs text-slate-300 cursor-pointer select-none touch-manipulation sm:px-3 sm:text-sm"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            onClick={() => {
              if (!touchHandledRef.current) {
                handleButtonClick("NE");
              }
              touchHandledRef.current = false;
            }}
            onTouchStart={(e) => {
              touchHandledRef.current = true;
              handleButtonClick("NE");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleButtonClick("NE");
              }
            }}
          >
            NE
          </div>

          {/* Middle row */}
          <div
            role="button"
            tabIndex={0}
            className="min-h-[44px] rounded-lg bg-white/5 px-2 py-2 text-xs text-slate-300 cursor-pointer select-none touch-manipulation sm:px-3 sm:text-sm md:text-base"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            onClick={() => {
              if (!touchHandledRef.current) {
                handleButtonClick("W");
              }
              touchHandledRef.current = false;
            }}
            onTouchStart={(e) => {
              touchHandledRef.current = true;
              handleButtonClick("W");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleButtonClick("W");
              }
            }}
          >
            West
          </div>
          <div />
          <div
            role="button"
            tabIndex={0}
            className="min-h-[44px] rounded-lg bg-white/5 px-2 py-2 text-xs text-slate-300 cursor-pointer select-none touch-manipulation sm:px-3 sm:text-sm md:text-base"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            onClick={() => {
              if (!touchHandledRef.current) {
                handleButtonClick("E");
              }
              touchHandledRef.current = false;
            }}
            onTouchStart={(e) => {
              touchHandledRef.current = true;
              handleButtonClick("E");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleButtonClick("E");
              }
            }}
          >
            East
          </div>

          {/* Bottom row */}
          <div
            role="button"
            tabIndex={0}
            className="min-h-[44px] rounded-lg bg-white/5 px-2 py-2 text-xs text-slate-300 cursor-pointer select-none touch-manipulation sm:px-3 sm:text-sm"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            onClick={() => {
              if (!touchHandledRef.current) {
                handleButtonClick("SW");
              }
              touchHandledRef.current = false;
            }}
            onTouchStart={(e) => {
              touchHandledRef.current = true;
              handleButtonClick("SW");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleButtonClick("SW");
              }
            }}
          >
            SW
          </div>
          <div
            role="button"
            tabIndex={0}
            className="min-h-[44px] rounded-lg bg-white/5 px-2 py-2 text-xs text-slate-300 cursor-pointer select-none touch-manipulation sm:px-3 sm:text-sm md:text-base"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            onClick={() => {
              if (!touchHandledRef.current) {
                handleButtonClick("S");
              }
              touchHandledRef.current = false;
            }}
            onTouchStart={(e) => {
              touchHandledRef.current = true;
              handleButtonClick("S");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleButtonClick("S");
              }
            }}
          >
            South
          </div>
          <div
            role="button"
            tabIndex={0}
            className="min-h-[44px] rounded-lg bg-white/5 px-2 py-2 text-xs text-slate-300 cursor-pointer select-none touch-manipulation sm:px-3 sm:text-sm"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            onClick={() => {
              if (!touchHandledRef.current) {
                handleButtonClick("SE");
              }
              touchHandledRef.current = false;
            }}
            onTouchStart={(e) => {
              touchHandledRef.current = true;
              handleButtonClick("SE");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleButtonClick("SE");
              }
            }}
          >
            SE
          </div>
        </div>
      </div>
    </div>
  );
}
