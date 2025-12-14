import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "~/server/types/prisma";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  resolveAttackTurn,
  type PlayerStats,
  type MonsterTemplate,
} from "~/server/battle/engine";
import { applyRegen } from "~/server/regen/applyRegen";
import { syncPveKillsToLeaderboard } from "~/server/lib/leaderboard-sync";

// Helper function to sync Character model with PlayerStats
async function syncCharacterWithPlayerStats(
  userId: string,
  playerStats: { currentHP: number; maxHP: number; currentSP: number; maxSP: number; vitality: number; strength: number; speed: number; dexterity: number },
  db: any
) {
  try {
    // Find the character by userId
    const character = await db.character.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (character) {
      // Use the maxHP and maxSP values from PlayerStats (they may include equipment bonuses or other modifiers)
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
      // Character doesn't exist - this shouldn't happen in normal flow, but log it
      console.warn(`Character not found for userId: ${userId} when syncing PlayerStats`);
    }
  } catch (error) {
    // Log error but don't throw - we don't want to break battle if sync fails
    console.error(`Error syncing Character with PlayerStats for userId ${userId}:`, error);
  }
}

export const battleRouter = createTRPCRouter({
  // List all available monster templates
  listMonsters: protectedProcedure.query(async ({ ctx }) => {
    const monsters = await ctx.db.monster.findMany({
      orderBy: { level: "asc" },
    });

    return monsters;
  }),

  // Start a new battle with a monster
  // TODO: rate limit battle start (e.g., max 5 battles per minute)
  startBattle: protectedProcedure
    .input(
      z.object({
        monsterId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get player first
      const player = await ctx.db.player.findUnique({
        where: { userId },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Check if user already has an active battle
      const activeBattle = await ctx.db.battle.findFirst({
        where: {
          playerId: player.id,
          status: "ACTIVE",
        },
      });

      if (activeBattle) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have an active battle",
        });
      }

      // Get monster template
      const monster = await ctx.db.monster.findUnique({
        where: { id: input.monsterId },
      });

      if (!monster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Monster not found",
        });
      }

      // Get player stats (from PlayerStats model) - already fetched above, but need stats
      const playerWithStats = await ctx.db.player.findUnique({
        where: { id: player.id },
        include: { stats: true },
      });

      if (!playerWithStats || !playerWithStats.stats) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player or stats not found",
        });
      }

      // Apply regen BEFORE starting battle (server-authoritative)
      const now = new Date();
      if (!playerWithStats.stats.lastRegenAt) {
        const character = await ctx.db.character.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const initialLastRegenAt = character?.createdAt 
          ? new Date(character.createdAt)
          : new Date(now.getTime() - 60000);
        
        await ctx.db.playerStats.update({
          where: { playerId: playerWithStats.id },
          data: { lastRegenAt: initialLastRegenAt },
        });
        playerWithStats.stats.lastRegenAt = initialLastRegenAt;
      }

      const regenResult = applyRegen(now, {
        hp: playerWithStats.stats.currentHP,
        sp: playerWithStats.stats.currentSP,
        maxHp: playerWithStats.stats.maxHP,
        maxSp: playerWithStats.stats.maxSP,
        hpRegenPerMin: playerWithStats.stats.hpRegenPerMin ?? 100,
        spRegenPerMin: playerWithStats.stats.spRegenPerMin ?? 100,
        lastRegenAt: playerWithStats.stats.lastRegenAt,
      });

      // Update player stats if regen occurred
      if (regenResult.didUpdate) {
        await ctx.db.playerStats.update({
          where: { playerId: playerWithStats.id },
          data: {
            currentHP: regenResult.hp,
            currentSP: regenResult.sp,
            lastRegenAt: regenResult.lastRegenAt,
          },
        });
        playerWithStats.stats.currentHP = regenResult.hp;
        playerWithStats.stats.currentSP = regenResult.sp;
        playerWithStats.stats.lastRegenAt = regenResult.lastRegenAt;
      }

      // Sync Character with PlayerStats after regen
      await syncCharacterWithPlayerStats(
        userId,
        {
          currentHP: playerWithStats.stats.currentHP,
          maxHP: playerWithStats.stats.maxHP,
          currentSP: playerWithStats.stats.currentSP,
          maxSP: playerWithStats.stats.maxSP,
          vitality: playerWithStats.stats.vitality,
          strength: playerWithStats.stats.strength,
          speed: playerWithStats.stats.speed,
          dexterity: playerWithStats.stats.dexterity,
        },
        ctx.db
      );

      // Create battle with snapshot of HP/SP (AFTER regen applied)
      const battle = await ctx.db.battle.create({
        data: {
          playerId: playerWithStats.id,
          monsterId: monster.id,
          status: "ACTIVE",
          turnNumber: 1,
          playerHp: playerWithStats.stats.currentHP,
          playerSp: playerWithStats.stats.currentSP,
          monsterHp: monster.maxHp,
          log: [
            {
              message: `Battle begins! You face a level ${monster.level} ${monster.name}.`,
              turnNumber: 0,
            },
          ],
        },
        include: {
          monster: true,
        },
      });

      return battle;
    }),

  // Get the current active battle for the user
  getActiveBattle: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get player first
    const player = await ctx.db.player.findUnique({
      where: { userId },
    });

    if (!player) {
      return null;
    }

    const battle = await ctx.db.battle.findFirst({
      where: {
        playerId: player.id,
        status: "ACTIVE",
      },
      include: {
        monster: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return battle;
  }),

  // Execute an attack turn
  // TODO: rate limit attack actions (e.g., max 10 attacks per second, 300 per minute)
  attack: protectedProcedure
    .input(
      z.object({
        battleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get battle and verify ownership
      const battle = await ctx.db.battle.findUnique({
        where: { id: input.battleId },
        include: { monster: true },
      });

      if (!battle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Battle not found",
        });
      }

      // Get player to verify ownership
      const player = await ctx.db.player.findUnique({
        where: { userId },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      if (battle.playerId !== player.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not own this battle",
        });
      }

      if (battle.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Battle is not active",
        });
      }

      // Get current player stats (player already fetched above)
      const playerWithStats = await ctx.db.player.findUnique({
        where: { id: player.id },
        include: { stats: true },
      });

      if (!playerWithStats || !playerWithStats.stats) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player or stats not found",
        });
      }

      // Apply regen BEFORE attack (server-authoritative)
      const now = new Date();
      if (!playerWithStats.stats.lastRegenAt) {
        const character = await ctx.db.character.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const initialLastRegenAt = character?.createdAt 
          ? new Date(character.createdAt)
          : new Date(now.getTime() - 60000);
        
        await ctx.db.playerStats.update({
          where: { playerId: playerWithStats.id },
          data: { lastRegenAt: initialLastRegenAt },
        });
        playerWithStats.stats.lastRegenAt = initialLastRegenAt;
      }

      const regenResult = applyRegen(now, {
        hp: playerWithStats.stats.currentHP,
        sp: playerWithStats.stats.currentSP,
        maxHp: playerWithStats.stats.maxHP,
        maxSp: playerWithStats.stats.maxSP,
        hpRegenPerMin: playerWithStats.stats.hpRegenPerMin ?? 100,
        spRegenPerMin: playerWithStats.stats.spRegenPerMin ?? 100,
        lastRegenAt: playerWithStats.stats.lastRegenAt,
      });

      // Update player stats if regen occurred
      if (regenResult.didUpdate) {
        await ctx.db.playerStats.update({
          where: { playerId: playerWithStats.id },
          data: {
            currentHP: regenResult.hp,
            currentSP: regenResult.sp,
            lastRegenAt: regenResult.lastRegenAt,
          },
        });
        playerWithStats.stats.currentHP = regenResult.hp;
        playerWithStats.stats.currentSP = regenResult.sp;
        playerWithStats.stats.lastRegenAt = regenResult.lastRegenAt;
      }

      // Sync Character with PlayerStats after regen
      await syncCharacterWithPlayerStats(
        userId,
        {
          currentHP: playerWithStats.stats.currentHP,
          maxHP: playerWithStats.stats.maxHP,
          currentSP: playerWithStats.stats.currentSP,
          maxSP: playerWithStats.stats.maxSP,
          vitality: playerWithStats.stats.vitality,
          strength: playerWithStats.stats.strength,
          speed: playerWithStats.stats.speed,
          dexterity: playerWithStats.stats.dexterity,
        },
        ctx.db
      );

      // Use battle HP/SP for combat calculations (battle state is authoritative during combat)
      const playerStats: PlayerStats = {
        vitality: playerWithStats.stats.vitality,
        strength: playerWithStats.stats.strength,
        speed: playerWithStats.stats.speed,
        dexterity: playerWithStats.stats.dexterity,
        currentHp: battle.playerHp,
        currentSp: battle.playerSp,
        maxHp: playerWithStats.stats.maxHP,
        maxSp: playerWithStats.stats.maxSP,
      };

      const monsterTemplate: MonsterTemplate = {
        id: battle.monster.id,
        name: battle.monster.name,
        level: battle.monster.level,
        vitality: battle.monster.vitality,
        strength: battle.monster.strength,
        speed: battle.monster.speed,
        dexterity: battle.monster.dexterity,
        maxHp: battle.monster.maxHp,
      };

      // Resolve turn
      const { updatedState, events } = resolveAttackTurn(
        {
          playerHp: battle.playerHp,
          playerSp: battle.playerSp,
          monsterHp: battle.monsterHp,
          turnNumber: battle.turnNumber,
        },
        playerStats,
        monsterTemplate
      );

      // Append events to log
      const currentLog = Array.isArray(battle.log) ? battle.log : [];
      const updatedLog = [...currentLog, ...events];

      // Determine new status
      let newStatus: "ACTIVE" | "WON" | "LOST" | "FLED" = battle.status;
      if (updatedState.monsterHp <= 0) {
        newStatus = "WON";
        // Grant rewards
        await ctx.db.player.update({
          where: { id: playerWithStats.id },
          data: {
            experience: { increment: battle.monster.xpReward },
            gold: { increment: battle.monster.goldReward },
          },
        });

        // Update PvE stats
        const profile = await ctx.db.playerProfile.findUnique({
          where: { userId: playerWithStats.userId },
          include: { pveRecord: true },
        });

        if (profile) {
          // Update or create PlayerPveRecord
          if (profile.pveRecord) {
            await ctx.db.playerPveRecord.update({
              where: { profileId: profile.id },
              data: {
                totalKills: { increment: 1 },
              },
            });
          } else {
            await ctx.db.playerPveRecord.create({
              data: {
                profileId: profile.id,
                totalKills: 1,
                bossesSlain: 0,
                deathsUsed: playerWithStats.deathCount ?? 0,
                deathsLimit: 5,
              },
            });
          }

          // Sync PvE kills from profile to leaderboard
          await syncPveKillsToLeaderboard(playerWithStats.userId, ctx.db);
        }

        updatedLog.push({
          message: `You gained ${battle.monster.xpReward} XP and ${battle.monster.goldReward} gold!`,
          turnNumber: updatedState.turnNumber,
        });
      } else if (updatedState.playerHp <= 0) {
        newStatus = "LOST";
      }

      // Update battle
      const updatedBattle = await ctx.db.battle.update({
        where: { id: input.battleId },
        data: {
          status: newStatus,
          turnNumber: updatedState.turnNumber,
          playerHp: updatedState.playerHp,
          playerSp: updatedState.playerSp,
          monsterHp: updatedState.monsterHp,
          log: updatedLog as unknown as Prisma.InputJsonValue,
        },
        include: {
          monster: true,
        },
      });

      // Update player HP/SP in stats
      const updatedStats = await ctx.db.playerStats.update({
        where: { playerId: playerWithStats.id },
        data: {
          currentHP: updatedState.playerHp,
          currentSP: updatedState.playerSp,
        },
      });

      // Sync Character model with PlayerStats
      await syncCharacterWithPlayerStats(
        playerWithStats.userId,
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
        ctx.db
      );

      return updatedBattle;
    }),

  // Flee from battle
  // TODO: rate limit flee actions (e.g., max 5 flees per minute)
  flee: protectedProcedure
    .input(
      z.object({
        battleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get battle and verify ownership
      const battle = await ctx.db.battle.findUnique({
        where: { id: input.battleId },
        include: { monster: true },
      });

      if (!battle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Battle not found",
        });
      }

      // Get player to verify ownership
      const player = await ctx.db.player.findUnique({
        where: { userId },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      if (battle.playerId !== player.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not own this battle",
        });
      }

      if (battle.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Battle is not active",
        });
      }

      // Get player stats (player already fetched above)
      const playerWithStats = await ctx.db.player.findUnique({
        where: { id: player.id },
        include: { stats: true },
      });

      if (!playerWithStats || !playerWithStats.stats) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player or stats not found",
        });
      }

      // Apply regen BEFORE fleeing (server-authoritative)
      const now = new Date();
      if (!playerWithStats.stats.lastRegenAt) {
        const character = await ctx.db.character.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const initialLastRegenAt = character?.createdAt 
          ? new Date(character.createdAt)
          : new Date(now.getTime() - 60000);
        
        await ctx.db.playerStats.update({
          where: { playerId: playerWithStats.id },
          data: { lastRegenAt: initialLastRegenAt },
        });
        playerWithStats.stats.lastRegenAt = initialLastRegenAt;
      }

      const regenResult = applyRegen(now, {
        hp: playerWithStats.stats.currentHP,
        sp: playerWithStats.stats.currentSP,
        maxHp: playerWithStats.stats.maxHP,
        maxSp: playerWithStats.stats.maxSP,
        hpRegenPerMin: playerWithStats.stats.hpRegenPerMin ?? 100,
        spRegenPerMin: playerWithStats.stats.spRegenPerMin ?? 100,
        lastRegenAt: playerWithStats.stats.lastRegenAt,
      });

      // Update player stats if regen occurred
      if (regenResult.didUpdate) {
        await ctx.db.playerStats.update({
          where: { playerId: playerWithStats.id },
          data: {
            currentHP: regenResult.hp,
            currentSP: regenResult.sp,
            lastRegenAt: regenResult.lastRegenAt,
          },
        });
        playerWithStats.stats.currentHP = regenResult.hp;
        playerWithStats.stats.currentSP = regenResult.sp;
        playerWithStats.stats.lastRegenAt = regenResult.lastRegenAt;
      }

      // Sync Character with PlayerStats after regen
      await syncCharacterWithPlayerStats(
        userId,
        {
          currentHP: playerWithStats.stats.currentHP,
          maxHP: playerWithStats.stats.maxHP,
          currentSP: playerWithStats.stats.currentSP,
          maxSP: playerWithStats.stats.maxSP,
          vitality: playerWithStats.stats.vitality,
          strength: playerWithStats.stats.strength,
          speed: playerWithStats.stats.speed,
          dexterity: playerWithStats.stats.dexterity,
        },
        ctx.db
      );

      // Append flee message to log
      const currentLog = Array.isArray(battle.log) ? battle.log : [];
      const updatedLog = [
        ...currentLog,
        {
          message: "You fled from the battle!",
          turnNumber: battle.turnNumber,
        },
      ];

      // Update battle status to FLED
      const updatedBattle = await ctx.db.battle.update({
        where: { id: input.battleId },
        data: {
          status: "FLED",
          log: updatedLog as unknown as Prisma.InputJsonValue,
        },
        include: {
          monster: true,
        },
      });

      return updatedBattle;
    }),
});
