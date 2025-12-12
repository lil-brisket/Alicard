"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";

export function CharacterSummaryCard() {
  const { data: player, isLoading: playerLoading, error: playerError } = api.player.getCurrent.useQuery(
    undefined,
    {
      refetchInterval: 5000, // Refetch every 5 seconds to keep updated
      retry: false, // Don't retry if player doesn't exist
    }
  );

  const { data: character, isLoading: characterLoading } = api.character.getOrCreateCurrent.useQuery(
    undefined,
    {
      refetchInterval: 5000, // Refetch every 5 seconds to keep updated
    }
  );

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

  // Check for active battle (only query after other queries have succeeded to ensure context is ready)
  const { data: activeBattle } = api.battle.getActiveBattle.useQuery(undefined, {
    refetchInterval: 2000,
    retry: false,
    enabled: !characterLoading && character !== undefined && typeof window !== "undefined",
  });
  const isInBattle = activeBattle?.status === "ACTIVE" ?? false;

  // Use PlayerStats for HP/SP (with regen applied) if available, otherwise fall back to Character
  // Player might not exist yet, so we gracefully fall back to character data
  const serverCurrentHp = player?.stats?.currentHP ?? character?.currentHp ?? 0;
  const serverMaxHp = player?.stats?.maxHP ?? character?.maxHp ?? 1;
  const serverCurrentStamina = player?.stats?.currentSP ?? character?.currentStamina ?? 0;
  const serverMaxStamina = player?.stats?.maxSP ?? character?.maxStamina ?? 1;
  const hpRegenPerMin = player?.stats?.hpRegenPerMin ?? 100;
  const spRegenPerMin = player?.stats?.spRegenPerMin ?? 100;

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

  // Update base values when server data changes
  useEffect(() => {
    if (character && (serverCurrentHp !== null || serverCurrentStamina !== null)) {
      // Check if pools are already at max
      const hpIsFull = serverCurrentHp >= serverMaxHp;
      const staminaIsFull = serverCurrentStamina >= serverMaxStamina;

      // Check if we need to sync with server (significant difference indicates combat damage or server update)
      const currentInterpolatedHp = interpolatedHp ?? baseHpRef.current ?? serverCurrentHp;
      const currentInterpolatedStamina = interpolatedStamina ?? baseStaminaRef.current ?? serverCurrentStamina;
      
      const hpDiff = Math.abs(currentInterpolatedHp - serverCurrentHp);
      const staminaDiff = Math.abs(currentInterpolatedStamina - serverCurrentStamina);

      // Sync base values if server value is significantly different (combat damage) or if not initialized
      if (baseHpRef.current === null || (hpDiff > 0.1 && serverCurrentHp < currentInterpolatedHp)) {
        baseHpRef.current = serverCurrentHp;
        lastHpSyncRef.current = Date.now();
        if (hpIsFull) {
          setInterpolatedHp(serverMaxHp);
        } else {
          setInterpolatedHp(serverCurrentHp);
        }
      }

      if (baseStaminaRef.current === null || (staminaDiff > 0.1 && serverCurrentStamina < currentInterpolatedStamina)) {
        baseStaminaRef.current = serverCurrentStamina;
        if (!lastSpSyncRef.current) {
          lastSpSyncRef.current = Date.now();
        }
        if (staminaIsFull) {
          setInterpolatedStamina(serverMaxStamina);
        } else {
          setInterpolatedStamina(serverCurrentStamina);
        }
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
      hpRegenPerSecRef.current = hpRegenPerMin / 60; // Convert per minute to per second
      spRegenPerSecRef.current = spRegenPerMin / 60;
    }
  }, [serverCurrentHp, serverCurrentStamina, serverMaxHp, serverMaxStamina, hpRegenPerMin, spRegenPerMin, character, interpolatedHp, interpolatedStamina]);

  // Real-time interpolation effect - calculate based on elapsed time
  // DISABLED during active battle
  useEffect(() => {
    if (!character || baseHpRef.current === null || baseStaminaRef.current === null || isInBattle) {
      // If in battle, use server values directly (no interpolation)
      if (isInBattle) {
        setInterpolatedHp(serverCurrentHp);
        setInterpolatedStamina(serverCurrentStamina);
      }
      return;
    }

    const interval = setInterval(() => {
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
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [character, isInBattle, serverCurrentHp, serverCurrentStamina]);

  // Only show loading if character is loading (character is required, player is optional)
  if (characterLoading || !character) {
    return (
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-bold text-cyan-400">Character Summary</h2>
        <div className="flex items-center justify-center py-8">
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Use interpolated values if available, otherwise fall back to server values
  const currentHp = interpolatedHp !== null ? interpolatedHp : serverCurrentHp;
  const maxHp = serverMaxHp;
  const currentStamina = interpolatedStamina !== null ? interpolatedStamina : serverCurrentStamina;
  const maxStamina = serverMaxStamina;

  const hpPercentage = (currentHp / maxHp) * 100;
  const staminaPercentage = (currentStamina / maxStamina) * 100;
  const isPermaDead = character.deaths >= 5;
  const deathsRemaining = Math.max(0, 5 - character.deaths);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-cyan-400">Character Summary</h2>

      <div className="space-y-4">
        {/* Name & Level */}
        <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
          <div>
            <p className="text-xs text-slate-400">Character Name</p>
            <p className="text-lg font-semibold text-cyan-300">
              {character.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Level</p>
            <p className="text-xl font-bold text-cyan-400">
              Lv.{character.level}
            </p>
          </div>
        </div>

        {/* Gender */}
        <div>
          <p className="text-xs text-slate-400">Gender</p>
          <p className="text-sm font-medium capitalize text-slate-300">
            {character.gender}
          </p>
        </div>

        {/* Floor & Location */}
        <div>
          <p className="text-xs text-slate-400">Location</p>
          <p className="text-sm font-semibold text-slate-200">
            Floor {character.floor} – {character.location}
          </p>
        </div>

        {/* HP Bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">HP</span>
            <span className="font-medium text-slate-300">
              {Math.floor(currentHp)} / {maxHp}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-100 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              style={{ width: `${Math.min(100, Math.max(0, hpPercentage))}%` }}
            />
          </div>
        </div>

        {/* Stamina Bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Stamina</span>
            <span className="font-medium text-slate-300">
              {Math.floor(currentStamina)} / {maxStamina}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-100 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
              style={{ width: `${Math.min(100, Math.max(0, staminaPercentage))}%` }}
            />
          </div>
        </div>

        {/* Regen Display */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Regen</span>
            <span className="font-medium text-cyan-400">
              HP +{hpRegenPerMin ?? 100}/min • SP +{spRegenPerMin ?? 100}/min
            </span>
          </div>
        </div>

        {/* Death Counter */}
        <div
          className={`rounded-lg border p-3 ${
            isPermaDead
              ? "border-red-500/50 bg-red-950/30"
              : "border-slate-700/50 bg-slate-800/30"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">Deaths</p>
            <p
              className={`text-xs font-semibold ${
                isPermaDead ? "text-red-400" : "text-slate-300"
              }`}
            >
              {character.deaths} / 5
            </p>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded ${
                  i < character.deaths
                    ? "bg-red-600 shadow-[0_0_4px_rgba(220,38,38,0.5)]"
                    : "bg-slate-700"
                }`}
              />
            ))}
          </div>
          {!isPermaDead && (
            <p className="mt-2 text-xs text-slate-400">
              {deathsRemaining} live{deathsRemaining !== 1 ? "s" : ""}{" "}
              remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

