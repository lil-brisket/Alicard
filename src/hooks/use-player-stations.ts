import { useMemo } from "react";

type Station = "SMELTER" | "ANVIL" | "FORGE" | "TEMPERING_RACK";

/**
 * Hook to get player's available crafting stations
 * 
 * TODO: Replace this stub with actual player station data from:
 * - Player housing/workshop system
 * - Station ownership/access checks
 * - Guild stations
 * 
 * For now, returns all stations as available (stub implementation)
 */
export function usePlayerStations(): Set<Station> {
  // Stub: return all stations as available
  // In the future, this will query player data for owned/accessible stations
  return useMemo(
    () => new Set<Station>(["SMELTER", "ANVIL", "FORGE", "TEMPERING_RACK"]),
    []
  );
}

