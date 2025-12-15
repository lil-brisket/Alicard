"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";

type ProfileStatsCardProps = {
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
  maxHP: number;
  currentHP: number;
  maxSP: number;
  currentSP: number;
  hpRegenPerMin?: number;
  spRegenPerMin?: number;
};

export function ProfileStatsCard({
  vitality,
  strength,
  speed,
  dexterity,
  maxHP: initialMaxHP,
  currentHP: initialCurrentHP,
  maxSP: initialMaxSP,
  currentSP: initialCurrentSP,
  hpRegenPerMin: initialHpRegenPerMin = 100,
  spRegenPerMin: initialSpRegenPerMin = 100,
}: ProfileStatsCardProps) {
  const utils = api.useUtils();
  
  // Fetch real-time data
  const { data: player } = api.player.getCurrent.useQuery(undefined, {
    refetchInterval: 5000,
    retry: false,
  });

  const { data: character } = api.character.getOrCreateCurrent.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Real-time interpolation state
  const [interpolatedHp, setInterpolatedHp] = useState<number | null>(null);
  const [interpolatedStamina, setInterpolatedStamina] = useState<number | null>(null);
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

  // Check for active battle (only after we have player/character data to ensure context is ready)
  const { data: activeBattle } = api.battle.getActiveBattle.useQuery(undefined, {
    refetchInterval: 2000,
    retry: false,
    enabled: player !== undefined || character !== undefined, // Only query after we have some data
  });
  const isInBattle = activeBattle?.status === "ACTIVE";

  // Use PlayerStats for HP/SP (with regen applied) if available, otherwise fall back to Character or initial props
  const serverCurrentHp = player?.stats?.currentHP ?? character?.currentHp ?? initialCurrentHP;
  const serverMaxHp = player?.stats?.maxHP ?? character?.maxHp ?? initialMaxHP;
  const serverCurrentStamina = player?.stats?.currentSP ?? character?.currentStamina ?? initialCurrentSP;
  const serverMaxStamina = player?.stats?.maxSP ?? character?.maxStamina ?? initialMaxSP;
  const hpRegenPerMin = player?.stats?.hpRegenPerMin ?? initialHpRegenPerMin;
  const spRegenPerMin = player?.stats?.spRegenPerMin ?? initialSpRegenPerMin;

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

  // Detect battle end and immediately refetch data
  useEffect(() => {
    const wasInBattle = previousBattleStatusRef.current;
    const nowInBattle = isInBattle;
    
    // Battle just ended - immediately refetch player and character data
    if (wasInBattle && !nowInBattle) {
      void utils.player.getCurrent.invalidate();
      void utils.character.getOrCreateCurrent.invalidate();
      // Force immediate refetch
      void utils.player.getCurrent.refetch();
      void utils.character.getOrCreateCurrent.refetch();
    }
    
    previousBattleStatusRef.current = nowInBattle;
  }, [isInBattle, utils]);

  // Update base values when server data changes
  useEffect(() => {
    if (serverCurrentHp !== null && serverCurrentStamina !== null) {
      // Check if pools are already at max
      const hpIsFull = serverCurrentHp >= serverMaxHp;
      const staminaIsFull = serverCurrentStamina >= serverMaxStamina;

      // Check if server values actually changed (prevents unnecessary resets)
      const serverHpChanged = previousServerHpRef.current === null || 
                              Math.abs(previousServerHpRef.current - serverCurrentHp) > 0.01;
      const serverStaminaChanged = previousServerStaminaRef.current === null || 
                                   Math.abs(previousServerStaminaRef.current - serverCurrentStamina) > 0.01;

      // Check if we need to sync with server
      const currentInterpolatedHp = interpolatedHp ?? baseHpRef.current ?? serverCurrentHp;
      const currentInterpolatedStamina = interpolatedStamina ?? baseStaminaRef.current ?? serverCurrentStamina;
      
      const hpDiff = Math.abs(currentInterpolatedHp - serverCurrentHp);
      const staminaDiff = Math.abs(currentInterpolatedStamina - serverCurrentStamina);

      // After battle ends, sync immediately (no threshold check)
      // During battle or if damage detected, sync immediately
      // Otherwise, only sync if difference is significant AND server value actually changed (prevents jitter)
      const battleJustEnded = previousBattleStatusRef.current && !isInBattle;
      const shouldSyncHp = baseHpRef.current === null || 
                          battleJustEnded || 
                          isInBattle ||
                          (serverHpChanged && hpDiff > 1.0 && serverCurrentHp < currentInterpolatedHp);
      
      const shouldSyncStamina = baseStaminaRef.current === null || 
                                battleJustEnded || 
                                isInBattle ||
                                (serverStaminaChanged && staminaDiff > 1.0 && serverCurrentStamina < currentInterpolatedStamina);

      // Sync base values instantly after battle or when needed
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
        // Server value changed but we don't need to sync - just update the ref
        previousServerHpRef.current = serverCurrentHp;
      }

      if (shouldSyncStamina) {
        baseStaminaRef.current = serverCurrentStamina;
        if (!lastSpSyncRef.current) {
          lastSpSyncRef.current = Date.now();
        } else if (battleJustEnded || isInBattle) {
          // Reset sync time after battle for fresh regen calculation
          lastSpSyncRef.current = Date.now();
        }
        if (staminaIsFull) {
          setInterpolatedStamina(serverMaxStamina);
        } else {
          setInterpolatedStamina(serverCurrentStamina);
        }
        previousServerStaminaRef.current = serverCurrentStamina;
      } else if (serverStaminaChanged) {
        // Server value changed but we don't need to sync - just update the ref
        previousServerStaminaRef.current = serverCurrentStamina;
      }

      // If pools are full, ensure they stay at max
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
  }, [serverCurrentHp, serverCurrentStamina, serverMaxHp, serverMaxStamina, hpRegenPerMin, spRegenPerMin, interpolatedHp, interpolatedStamina, isInBattle]);

  // Real-time interpolation effect - calculate based on elapsed time using requestAnimationFrame
  // DISABLED during active battle
  useEffect(() => {
    if (baseHpRef.current === null || baseStaminaRef.current === null || isInBattle) {
      // If in battle, use server values directly (no interpolation)
      if (isInBattle) {
        setInterpolatedHp(serverCurrentHp);
        setInterpolatedStamina(serverCurrentStamina);
      }
      // Cancel any pending animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Use requestAnimationFrame for smooth, jitter-free animation
    const animate = () => {
      if (maxHpRef.current !== null && maxStaminaRef.current !== null && baseHpRef.current !== null && baseStaminaRef.current !== null) {
        // Calculate HP interpolation (only if lastHpSyncRef is set)
        if (lastHpSyncRef.current !== null) {
          const newHp = calculateInterpolatedValue(
            baseHpRef.current,
            maxHpRef.current,
            hpRegenPerSecRef.current,
            lastHpSyncRef.current
          );
          setInterpolatedHp(newHp);
        }

        // Calculate Stamina interpolation (only if lastSpSyncRef is set)
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
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isInBattle, serverCurrentHp, serverCurrentStamina]);

  const stats = [
    { label: "Vitality", value: vitality, color: "text-red-400" },
    { label: "Strength", value: strength, color: "text-orange-400" },
    { label: "Speed", value: speed, color: "text-yellow-400" },
    { label: "Dexterity", value: dexterity, color: "text-green-400" },
  ];

  // Use interpolated values if available, otherwise fall back to server values
  const currentHP = interpolatedHp !== null ? interpolatedHp : serverCurrentHp;
  const maxHP = serverMaxHp;
  const currentSP = interpolatedStamina !== null ? interpolatedStamina : serverCurrentStamina;
  const maxSP = serverMaxStamina;

  const hpPercentage = (currentHP / maxHP) * 100;
  const spPercentage = (currentSP / maxSP) * 100;

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-cyan-400">Core Stats</h2>

      <div className="mb-4 grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4"
          >
            <p className="mb-1 text-xs text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Derived Stats */}
      <div className="space-y-3 border-t border-slate-700/50 pt-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">HP</span>
            <span className="font-medium text-slate-300">
              {Math.floor(currentHP)} / {maxHP}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500 ease-linear shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              style={{ width: `${Math.min(100, Math.max(0, hpPercentage))}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Stamina</span>
            <span className="font-medium text-slate-300">
              {Math.floor(currentSP)} / {maxSP}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 ease-linear shadow-[0_0_8px_rgba(34,211,238,0.5)]"
              style={{ width: `${Math.min(100, Math.max(0, spPercentage))}%` }}
            />
          </div>
        </div>

        {/* Regen Display */}
        <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Regen</span>
            <span className="font-medium text-cyan-400">
              HP +{hpRegenPerMin ?? 100}/min • SP +{spRegenPerMin ?? 100}/min
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
