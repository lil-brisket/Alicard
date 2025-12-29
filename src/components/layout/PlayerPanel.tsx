"use client";

import Image from "next/image";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useEffect, useRef, useState } from "react";

function Bar({
  label,
  current,
  max,
  color,
}: {
  label: string;
  current: number;
  max: number;
  color: "red" | "blue";
}) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const barColor = color === "red" 
    ? "bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
    : "bg-gradient-to-r from-blue-500 to-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]";
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-slate-300 tabular-nums">
          {Math.floor(current)} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-700/50">
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-linear`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PlayerPanelContent() {
  const utils = api.useUtils();
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
  const { data: activeAction, isLoading: actionLoading } = api.skillTraining.getActiveAction.useQuery();

  // Real-time interpolation state
  const [interpolatedHp, setInterpolatedHp] = useState<number | null>(null);
  const [interpolatedStamina, setInterpolatedStamina] = useState<number | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const baseHpRef = useRef<number | null>(null);
  const baseStaminaRef = useRef<number | null>(null);
  const maxHpRef = useRef<number | null>(null);
  const maxStaminaRef = useRef<number | null>(null);
  const hpRegenPerSecRef = useRef<number>(0);
  const spRegenPerSecRef = useRef<number>(0);
  const lastHpSyncRef = useRef<number | null>(null);
  const lastSpSyncRef = useRef<number | null>(null);
  const previousBattleStatusRef = useRef<boolean>(false);
  const previousServerHpRef = useRef<number | null>(null);
  const previousServerStaminaRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check for active battle
  const { data: activeBattle } = api.battle.getActiveBattle.useQuery(undefined, {
    refetchInterval: 2000,
    retry: false,
    enabled: player !== undefined || character !== undefined,
  });
  const isInBattle = activeBattle?.status === "ACTIVE";

  // Reset avatar error when settings change (must be before early returns)
  useEffect(() => {
    setAvatarError(false);
  }, [settings?.avatar]);

  // Calculate interpolated value based on elapsed time from base
  const calculateInterpolatedValue = (
    base: number,
    max: number,
    regenPerSec: number,
    lastSyncTime: number
  ): number => {
    if (base >= max) return max;
    const now = Date.now();
    const elapsedSeconds = (now - lastSyncTime) / 1000;
    const regenAmount = elapsedSeconds * regenPerSec;
    return Math.min(max, base + regenAmount);
  };

  // Compute derived values (safe to compute even if data is missing)
  const stats = player?.stats;
  const serverCurrentHp = stats?.currentHP ?? character?.currentHp ?? 0;
  const serverMaxHp = stats?.maxHP ?? character?.maxHp ?? 100;
  const serverCurrentStamina = stats?.currentSP ?? character?.currentStamina ?? 0;
  const serverMaxStamina = stats?.maxSP ?? character?.maxStamina ?? 50;
  const hpRegenPerMin = stats?.hpRegenPerMin ?? 100;
  const spRegenPerMin = stats?.spRegenPerMin ?? 100;

  // Detect battle end and immediately refetch data (must be before early returns)
  useEffect(() => {
    const wasInBattle = previousBattleStatusRef.current;
    const nowInBattle = isInBattle;
    
    if (wasInBattle && !nowInBattle) {
      void utils.player.getCurrent.invalidate();
      void utils.character.getOrCreateCurrent.invalidate();
      void utils.player.getCurrent.refetch();
      void utils.character.getOrCreateCurrent.refetch();
    }
    
    previousBattleStatusRef.current = nowInBattle;
  }, [isInBattle, utils]);

  // Update base values when server data changes (must be before early returns)
  useEffect(() => {
    if (serverCurrentHp !== null && serverCurrentStamina !== null && player && character && stats) {
      const hpIsFull = serverCurrentHp >= serverMaxHp;
      const staminaIsFull = serverCurrentStamina >= serverMaxStamina;

      const serverHpChanged = previousServerHpRef.current === null || 
                              Math.abs(previousServerHpRef.current - serverCurrentHp) > 0.01;
      const serverStaminaChanged = previousServerStaminaRef.current === null || 
                                   Math.abs(previousServerStaminaRef.current - serverCurrentStamina) > 0.01;

      const currentInterpolatedHp = interpolatedHp ?? baseHpRef.current ?? serverCurrentHp;
      const currentInterpolatedStamina = interpolatedStamina ?? baseStaminaRef.current ?? serverCurrentStamina;
      
      const hpDiff = Math.abs(currentInterpolatedHp - serverCurrentHp);
      const staminaDiff = Math.abs(currentInterpolatedStamina - serverCurrentStamina);

      const battleJustEnded = previousBattleStatusRef.current && !isInBattle;
      const shouldSyncHp = baseHpRef.current === null || 
                          battleJustEnded || 
                          isInBattle ||
                          (serverHpChanged && hpDiff > 1.0 && serverCurrentHp < currentInterpolatedHp);
      
      const shouldSyncStamina = baseStaminaRef.current === null || 
                                battleJustEnded || 
                                isInBattle ||
                                (serverStaminaChanged && staminaDiff > 1.0 && serverCurrentStamina < currentInterpolatedStamina);

      if (shouldSyncHp) {
        baseHpRef.current = serverCurrentHp;
        lastHpSyncRef.current = Date.now();
        if (hpIsFull) {
          setInterpolatedHp(serverMaxHp);
        } else {
          setInterpolatedHp(serverCurrentHp);
        }
        previousServerHpRef.current = serverCurrentHp;
      } else if (serverHpChanged) {
        previousServerHpRef.current = serverCurrentHp;
      }

      if (shouldSyncStamina) {
        baseStaminaRef.current = serverCurrentStamina;
        if (!lastSpSyncRef.current) {
          lastSpSyncRef.current = Date.now();
        } else if (battleJustEnded || isInBattle) {
          lastSpSyncRef.current = Date.now();
        }
        if (staminaIsFull) {
          setInterpolatedStamina(serverMaxStamina);
        } else {
          setInterpolatedStamina(serverCurrentStamina);
        }
        previousServerStaminaRef.current = serverCurrentStamina;
      } else if (serverStaminaChanged) {
        previousServerStaminaRef.current = serverCurrentStamina;
      }

      if (hpIsFull && interpolatedHp !== serverMaxHp) {
        setInterpolatedHp(serverMaxHp);
      }
      if (staminaIsFull && interpolatedStamina !== serverMaxStamina) {
        setInterpolatedStamina(serverMaxStamina);
      }

      maxHpRef.current = serverMaxHp;
      maxStaminaRef.current = serverMaxStamina;
      hpRegenPerSecRef.current = hpRegenPerMin / 60;
      spRegenPerSecRef.current = spRegenPerMin / 60;
    }
  }, [serverCurrentHp, serverCurrentStamina, serverMaxHp, serverMaxStamina, hpRegenPerMin, spRegenPerMin, interpolatedHp, interpolatedStamina, isInBattle, player, character, stats]);

  // Real-time interpolation effect (must be before early returns)
  useEffect(() => {
    if (baseHpRef.current === null || baseStaminaRef.current === null || isInBattle) {
      if (isInBattle && serverCurrentHp !== null && serverCurrentStamina !== null) {
        setInterpolatedHp(serverCurrentHp);
        setInterpolatedStamina(serverCurrentStamina);
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = () => {
      if (maxHpRef.current !== null && maxStaminaRef.current !== null && baseHpRef.current !== null && baseStaminaRef.current !== null) {
        if (lastHpSyncRef.current !== null) {
          const newHp = calculateInterpolatedValue(
            baseHpRef.current,
            maxHpRef.current,
            hpRegenPerSecRef.current,
            lastHpSyncRef.current
          );
          setInterpolatedHp(newHp);
        }

        if (lastSpSyncRef.current !== null) {
          const newStamina = calculateInterpolatedValue(
            baseStaminaRef.current,
            maxStaminaRef.current,
            spRegenPerSecRef.current,
            lastSpSyncRef.current
          );
          setInterpolatedStamina(newStamina);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isInBattle, serverCurrentHp, serverCurrentStamina]);

  const isLoading = characterLoading || playerLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!character || !player) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Unable to load player data</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Player stats not found</div>
      </div>
    );
  }

  // Get training info
  let trainingInfo: { label: string; progress: number } = {
    label: "Not training",
    progress: 0,
  };
  
  if (activeAction && !actionLoading) {
    const actionName = activeAction.action.name;
    const progress = activeAction.progressPct / 100;
    trainingInfo = {
      label: actionName,
      progress,
    };
  } else if (player.occupation) {
    trainingInfo = {
      label: player.occupation.name,
      progress: 0,
    };
  }

  // Get avatar URL from settings, fallback to silhouette
  const avatarUrl = (settings?.avatar && !avatarError) ? settings.avatar : "/character-silhouette.png";

  // Use interpolated values if available, otherwise fall back to server values
  const currentHP = interpolatedHp !== null ? interpolatedHp : serverCurrentHp;
  const maxHP = serverMaxHp;
  const currentSP = interpolatedStamina !== null ? interpolatedStamina : serverCurrentStamina;
  const maxSP = serverMaxStamina;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header with square avatar */}
      <div className="flex flex-col items-center gap-3">
        <Link 
          href="/profile" 
          className="relative h-48 w-48 overflow-hidden rounded-lg border-2 border-slate-700 transition-all hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/50 active:scale-95 cursor-pointer"
        >
          <Image
            src={avatarUrl}
            alt={`${character.name} avatar`}
            fill
            className="object-cover"
            sizes="192px"
            onError={() => {
              // Fallback to silhouette if avatar URL fails to load
              setAvatarError(true);
            }}
          />
        </Link>
        <div className="text-center">
          <div className="text-sm font-semibold">{character.name}</div>
          <div className="text-xs text-muted-foreground">Lv. {character.level}</div>
        </div>
      </div>

      {/* Pools - moved above money */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 space-y-3">
        <div className="text-sm font-semibold">Pools</div>
        <Bar label="HP" current={currentHP} max={maxHP} color="red" />
        <Bar label="SP" current={currentSP} max={maxSP} color="blue" />
      </div>

      {/* Coins - renamed from Money */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
        <div className="text-xs text-muted-foreground">Coins</div>
        <div className="text-lg font-bold tabular-nums">{player.gold.toLocaleString()}</div>
      </div>

      {/* Daily Quest Box - placeholder */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
        <div className="text-sm font-semibold mb-2">Daily Quest</div>
        <div className="text-xs text-muted-foreground text-center py-4">
          Coming soon
        </div>
      </div>

      {/* Training */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Training</div>
          <div className="text-xs text-muted-foreground">
            {(trainingInfo.progress * 100).toFixed(0)}%
          </div>
        </div>

        <div className="text-sm">{trainingInfo.label}</div>

        <div className="h-2 w-full rounded bg-muted">
          <div
            className="h-2 rounded bg-foreground"
            style={{ width: `${trainingInfo.progress * 100}%` }}
          />
        </div>

        {activeAction && activeAction.timeUntilCompletion > 0 && (
          <div className="text-xs text-muted-foreground">
            {Math.ceil(activeAction.timeUntilCompletion / 1000)}s remaining
          </div>
        )}
      </div>

      <div className="mt-auto text-xs text-muted-foreground text-center">
        Tip: Keep this panel "read-only" + quick actions later (heal, eat, claim bank interest).
      </div>
    </div>
  );
}

export function DesktopPlayerPanel({ isOpen = true }: { isOpen?: boolean }) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside className="hidden w-72 shrink-0 border-l lg:block">
      {/* sticky so it stays visible while scrolling */}
      <div className="sticky top-0 h-screen">
        <PlayerPanelContent />
      </div>
    </aside>
  );
}

