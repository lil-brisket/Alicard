"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

export function MovementControls() {
  const utils = api.useUtils();
  const [isMoving, setIsMoving] = useState(false);

  const moveMutation = api.player.move.useMutation({
    onSuccess: async () => {
      await utils.player.getPosition.invalidate();
      await utils.world.getActiveWorld.invalidate();
      setIsMoving(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to move");
      setIsMoving(false);
    },
  });

  const handleMove = (direction: "north" | "south" | "east" | "west") => {
    if (isMoving) return;
    setIsMoving(true);
    moveMutation.mutate({ direction });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">Movement</h2>
      <div className="flex flex-col items-center gap-2">
        {/* North */}
        <button
          onClick={() => handleMove("north")}
          disabled={isMoving}
          className="w-full rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
        >
          ↑ North
        </button>

        {/* East/West */}
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            onClick={() => handleMove("west")}
            disabled={isMoving}
            className="flex-1 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-none"
          >
            ← West
          </button>
          <button
            onClick={() => handleMove("east")}
            disabled={isMoving}
            className="flex-1 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-none"
          >
            East →
          </button>
        </div>

        {/* South */}
        <button
          onClick={() => handleMove("south")}
          disabled={isMoving}
          className="w-full rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
        >
          ↓ South
        </button>
      </div>
    </div>
  );
}
