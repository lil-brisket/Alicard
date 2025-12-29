"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

export function MobileStatusStrip() {
  const { data: character, isLoading: characterLoading } = api.character.getOrCreateCurrent.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const { data: player, isLoading: playerLoading } = api.player.getCurrent.useQuery(undefined, {
    refetchInterval: 5000,
    retry: false,
  });
  const { data: settings } = api.settings.getSettings.useQuery(undefined, {
    refetchInterval: 10000, // Refetch every 10 seconds to catch avatar updates
  });

  const [avatarError, setAvatarError] = useState(false);

  // Reset avatar error when settings change
  useEffect(() => {
    setAvatarError(false);
  }, [settings?.avatar]);

  const isLoading = characterLoading || playerLoading;

  // Use fallback values while loading
  const hp = player?.stats ? { current: player.stats.currentHP, max: player.stats.maxHP } : { current: 0, max: 0 };
  const sp = player?.stats ? { current: player.stats.currentSP, max: player.stats.maxSP } : { current: 0, max: 0 };
  const coins = player?.gold ?? 0;

  // Get avatar URL from settings, fallback to silhouette
  const avatarUrl = (settings?.avatar && !avatarError) ? settings.avatar : "/character-silhouette.png";

  return (
    <div className="lg:hidden border-b border-slate-800 bg-black px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-lg border-2 border-slate-700 flex-shrink-0">
          <Image
            src={avatarUrl}
            alt={character?.name ?? "avatar"}
            fill
            className="object-cover"
            sizes="40px"
            onError={() => {
              // Fallback to silhouette if avatar URL fails to load
              setAvatarError(true);
            }}
          />
        </div>

        <div className="flex-1 text-xs text-slate-300">
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="tabular-nums font-medium">HP {hp.current}/{hp.max}</span>
              <span className="tabular-nums font-medium">SP {sp.current}/{sp.max}</span>
              <span className="tabular-nums font-medium text-cyan-400">{coins.toLocaleString()} Coins</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

