// Combat finalization - handles combat resolution, rewards, and side effects
// This file handles database operations for combat outcomes

import type { PrismaClient } from "~/server/types/prisma";
import { syncPveKillsToLeaderboard } from "~/server/lib/leaderboard-sync";
import type { CombatState } from "./types";

interface SyncCharacterStats {
  currentHP: number;
  maxHP: number;
  currentSP: number;
  maxSP: number;
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
}

/**
 * Sync Character model with PlayerStats
 * Helper function to keep Character and PlayerStats in sync
 */
async function syncCharacterWithPlayerStats(
  userId: string,
  playerStats: SyncCharacterStats,
  db: PrismaClient
): Promise<void> {
  try {
    const character = await db.character.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (character) {
      await db.character.update({
        where: { id: character.id },
        data: {
          currentHp: playerStats.currentHP,
          maxHp: playerStats.maxHP,
          currentStamina: playerStats.currentSP,
          maxStamina: playerStats.maxSP,
          vitality: playerStats.vitality,
          strength: playerStats.strength,
          speed: playerStats.speed,
          dexterity: playerStats.dexterity,
        },
      });
    } else {
      console.warn(`Character not found for userId: ${userId} when syncing PlayerStats`);
    }
  } catch (error) {
    console.error(`Error syncing Character with PlayerStats for userId ${userId}:`, error);
  }
}

/**
 * Handle player death - respawn in nearest town or permadeath
 */
async function handlePlayerDeath(
  playerId: string,
  db: PrismaClient
): Promise<void> {
  const player = await db.player.findUnique({
    where: { id: playerId },
  });

  if (!player) return;

  const newDeathCount = player.deathCount + 1;

  // Log death
  await db.deathLog.create({
    data: {
      playerId,
      cause: "Combat",
    },
  });

  // Update death count
  await db.player.update({
    where: { id: playerId },
    data: { deathCount: newDeathCount },
  });

  // Check for permadeath (5 deaths)
  if (newDeathCount >= 5) {
    await db.player.update({
      where: { id: playerId },
      data: { isDeleted: true },
    });
  } else {
    // Revive in nearest town
    const nearestTown = await db.mapTile.findFirst({
      where: {
        isSafeZone: true,
        tileType: "TOWN",
      },
    });

    if (nearestTown) {
      await db.mapPosition.update({
        where: { playerId },
        data: {
          tileX: nearestTown.x,
          tileY: nearestTown.y,
          tileId: nearestTown.id,
        },
      });

      // Restore HP/SP to 50%
      const stats = await db.playerStats.findUnique({
        where: { playerId },
      });

      if (stats) {
        const updatedStats = await db.playerStats.update({
          where: { playerId },
          data: {
            currentHP: Math.floor(stats.maxHP * 0.5),
            currentSP: Math.floor(stats.maxSP * 0.5),
          },
        });

        // Sync Character model with PlayerStats
        await syncCharacterWithPlayerStats(
          player.userId,
          {
            currentHP: updatedStats.currentHP,
            maxHP: updatedStats.maxHP,
            currentSP: updatedStats.currentSP,
            maxSP: updatedStats.maxSP,
            vitality: updatedStats.vitality,
            strength: updatedStats.strength,
            speed: updatedStats.speed,
            dexterity: updatedStats.dexterity,
          },
          db
        );
      }
    }
  }
}

/**
 * Finalize combat victory - award rewards and update stats
 */
export async function finalizeCombatVictory(
  playerId: string,
  userId: string,
  enemyLevel: number,
  db: PrismaClient
): Promise<{ expGain: number; goldGain: number }> {
  // Award experience and gold
  const expGain = enemyLevel * 10;
  const goldGain = Math.floor(Math.random() * enemyLevel * 5) + enemyLevel;

  await db.player.update({
    where: { id: playerId },
    data: {
      experience: { increment: expGain },
      gold: { increment: goldGain },
    },
  });

  // Update PvE stats
  const profile = await db.playerProfile.findUnique({
    where: { userId },
    include: { pveRecord: true },
  });

  if (profile) {
    // Update or create PlayerPveRecord
    if (profile.pveRecord) {
      await db.playerPveRecord.update({
        where: { profileId: profile.id },
        data: {
          totalKills: { increment: 1 },
        },
      });
    } else {
      const player = await db.player.findUnique({
        where: { id: playerId },
      });
      await db.playerPveRecord.create({
        data: {
          profileId: profile.id,
          totalKills: 1,
          bossesSlain: 0,
          deathsUsed: player?.deathCount ?? 0,
          deathsLimit: 5,
        },
      });
    }

    // Sync PvE kills from profile to leaderboard
    await syncPveKillsToLeaderboard(userId, db);
  }

  return { expGain, goldGain };
}

/**
 * Finalize combat defeat - handle death
 */
export async function finalizeCombatDefeat(
  playerId: string,
  db: PrismaClient
): Promise<void> {
  await handlePlayerDeath(playerId, db);
}

/**
 * Update player HP/SP after combat turn
 */
export async function updatePlayerStats(
  playerId: string,
  userId: string,
  state: CombatState,
  maxHP: number,
  maxSP: number,
  db: PrismaClient
): Promise<void> {
  const updatedStats = await db.playerStats.update({
    where: { playerId },
    data: {
      currentHP: state.playerHP,
      currentSP: state.playerSP,
    },
  });

  // Sync Character model with PlayerStats
  await syncCharacterWithPlayerStats(
    userId,
    {
      currentHP: state.playerHP,
      maxHP,
      currentSP: state.playerSP,
      maxSP,
      vitality: updatedStats.vitality,
      strength: updatedStats.strength,
      speed: updatedStats.speed,
      dexterity: updatedStats.dexterity,
    },
    db
  );
}

