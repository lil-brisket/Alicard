"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

type Direction =
  | "north"
  | "south"
  | "east"
  | "west"
  | "northeast"
  | "northwest"
  | "southeast"
  | "southwest";

export function MovementControls() {
  const utils = api.useUtils();
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  const moveMutation = api.player.move.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.player.getPosition.cancel();

      // Snapshot previous value
      const previousPosition = utils.player.getPosition.getData();

      // Optimistically update position
      if (previousPosition) {
        let newX = previousPosition.tileX;
        let newY = previousPosition.tileY;

        switch (variables.direction) {
          case "north":
            newY -= 1;
            break;
          case "south":
            newY += 1;
            break;
          case "east":
            newX += 1;
            break;
          case "west":
            newX -= 1;
            break;
          case "northeast":
            newX += 1;
            newY -= 1;
            break;
          case "northwest":
            newX -= 1;
            newY -= 1;
            break;
          case "southeast":
            newX += 1;
            newY += 1;
            break;
          case "southwest":
            newX -= 1;
            newY += 1;
            break;
        }

        // Optimistically update the cache
        utils.player.getPosition.setData(undefined, {
          ...previousPosition,
          tileX: newX,
          tileY: newY,
        });
      }

      return { previousPosition };
    },
    onSuccess: async (data) => {
      // Update with actual server response
      utils.player.getPosition.setData(undefined, data);
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousPosition) {
        utils.player.getPosition.setData(undefined, context.previousPosition);
      }
      toast.error(error.message || "Failed to move");
    },
  });

  const handleMove = useCallback(
    (direction: Direction) => {
      if (moveMutation.isPending) return;
      moveMutation.mutate({ direction });
    },
    [moveMutation]
  );

  // Map keys to directions
  const getDirectionFromKeys = useCallback((): Direction | null => {
    const keys = Array.from(pressedKeys);
    const hasW = keys.includes("w");
    const hasS = keys.includes("s");
    const hasA = keys.includes("a");
    const hasD = keys.includes("d");

    // Diagonal movements
    if (hasW && hasD) return "northeast";
    if (hasW && hasA) return "northwest";
    if (hasS && hasD) return "southeast";
    if (hasS && hasA) return "southwest";

    // Cardinal movements
    if (hasW) return "north";
    if (hasS) return "south";
    if (hasA) return "west";
    if (hasD) return "east";

    return null;
  }, [pressedKeys]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const validKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

      if (validKeys.includes(key)) {
        e.preventDefault();
        setPressedKeys((prev) => {
          const next = new Set(prev);
          // Normalize arrow keys and WASD
          if (e.key === "ArrowUp" || key === "w") next.add("w");
          if (e.key === "ArrowDown" || key === "s") next.add("s");
          if (e.key === "ArrowLeft" || key === "a") next.add("a");
          if (e.key === "ArrowRight" || key === "d") next.add("d");
          return next;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const validKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

      if (validKeys.includes(key)) {
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

  // Process movement when keys are pressed
  useEffect(() => {
    if (pressedKeys.size === 0) return;

    // Immediate movement on key press
    const direction = getDirectionFromKeys();
    if (direction && !moveMutation.isPending) {
      handleMove(direction);
    }

    // Set up interval for continuous movement while keys are held
    const intervalId = setInterval(() => {
      const currentDirection = getDirectionFromKeys();
      if (currentDirection && !moveMutation.isPending) {
        handleMove(currentDirection);
      }
    }, 150); // Move every 150ms while key is held

    return () => clearInterval(intervalId);
  }, [pressedKeys, moveMutation.isPending, getDirectionFromKeys, handleMove]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">Movement</h2>
      <p className="text-sm text-slate-400">
        Use WASD or Arrow Keys. Hold multiple keys for diagonal movement (e.g., W+D for northeast).
      </p>
      <div className="flex flex-col items-center gap-2">
        {/* North */}
        <button
          onClick={() => handleMove("north")}
          disabled={moveMutation.isPending}
          className="w-full rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
        >
          ↑ North (W / ↑)
        </button>

        {/* East/West */}
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            onClick={() => handleMove("west")}
            disabled={moveMutation.isPending}
            className="flex-1 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-none"
          >
            ← West (A / ←)
          </button>
          <button
            onClick={() => handleMove("east")}
            disabled={moveMutation.isPending}
            className="flex-1 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-none"
          >
            East → (D / →)
          </button>
        </div>

        {/* South */}
        <button
          onClick={() => handleMove("south")}
          disabled={moveMutation.isPending}
          className="w-full rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
        >
          ↓ South (S / ↓)
        </button>
      </div>
    </div>
  );
}
