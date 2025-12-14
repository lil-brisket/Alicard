import { z } from "zod";
import { TRPCError } from "@trpc/server";
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

      // Check if user already has an active battle
      const activeBattle = await ctx.db.battle.findFirst({
        where: {
          userId,
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

      // Get player stats (from PlayerStats model)
      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { stats: true },
      });

      if (!player || !player.stats) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player or stats not found",
        });
      }

      // Apply regen BEFORE starting battle (server-authoritative)
      const now = new Date();
      if (!player.stats.lastRegenAt) {
        const character = await ctx.db.character.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const initialLastRegenAt = character?.createdAt 
          ? new Date(character.createdAt)
          : new Date(now.getTime() - 60000);
        
        await ctx.db.playerStats.update({
          where: { playerId: player.id },
          data: { lastRegenAt: initialLastRegenAt },
        });
        player.stats.lastRegenAt = initialLastRegenAt;
      }

      const regenResult = applyRegen(now, {
        hp: player.stats.currentHP,
        sp: player.stats.currentSP,
        maxHp: player.stats.maxHP,
        maxSp: player.stats.maxSP,
        hpRegenPerMin: player.stats.hpRegenPerMin ?? 100,
        spRegenPerMin: player.stats.spRegenPerMin ?? 100,
        lastRegenAt: player.stats.lastRegenAt,
      });

      // Update player stats if regen occurred
      if (regenResult.didUpdate) {
        await ctx.db.playerStats.update({
          where: { playerId: player.id },
          data: {
            currentHP: regenResult.hp,
            currentSP: regenResult.sp,
            lastRegenAt: regenResult.lastRegenAt,
          },
        });
        player.stats.currentHP = regenResult.hp;
        player.stats.currentSP = regenResult.sp;
        player.stats.lastRegenAt = regenResult.lastRegenAt;
      }

      // Sync Character with PlayerStats after regen
      await syncCharacterWithPlayerStats(
        userId,
        {
          currentHP: player.stats.currentHP,
          maxHP: player.stats.maxHP,
          currentSP: player.stats.currentSP,
          maxSP: player.stats.maxSP,
          vitality: player.stats.vitality,
          strength: player.stats.strength,
          speed: player.stats.speed,
          dexterity: player.stats.dexterity,
        },
        ctx.db
      );

      // Create battle with snapshot of HP/SP (AFTER regen applied)
      const battle = await ctx.db.battle.create({
        data: {
          userId,
          monsterId: monster.id,
          status: "ACTIVE",
          turnNumber: 1,
          playerHp: player.stats.currentHP,
          playerSp: player.stats.currentSP,
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

    const battle = await ctx.db.battle.findFirst({
      where: {
        userId,
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

      if (battle.userId !== userId) {
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

      // Get current player stats
      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { stats: true },
      });

      if (!player || !player.stats) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player or stats not found",
        });
      }

      // Apply regen BEFORE attack (server-authoritative)
      const now = new Date();
      if (!player.stats.lastRegenAt) {
        const character = await ctx.db.character.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const initialLastRegenAt = character?.createdAt 
          ? new Date(character.createdAt)
          : new Date(now.getTime() - 60000);
        
        await ctx.db.playerStats.update({
          where: { playerId: player.id },
          data: { lastRegenAt: initialLastRegenAt },
        });
        player.stats.lastRegenAt = initialLastRegenAt;
      }

      const regenResult = applyRegen(now, {
        hp: player.stats.currentHP,
        sp: player.stats.currentSP,
        maxHp: player.stats.maxHP,
        maxSp: player.stats.maxSP,
        hpRegenPerMin: player.stats.hpRegenPerMin ?? 100,
        spRegenPerMin: player.stats.spRegenPerMin ?? 100,
        lastRegenAt: player.stats.lastRegenAt,
      });

      // Update player stats if regen occurred
      if (regenResult.didUpdate) {
        await ctx.db.playerStats.update({
          where: { playerId: player.id },
          data: {
            currentHP: regenResult.hp,
            currentSP: regenResult.sp,
            lastRegenAt: regenResult.lastRegenAt,
          },
        });
        player.stats.currentHP = regenResult.hp;
        player.stats.currentSP = regenResult.sp;
        player.stats.lastRegenAt = regenResult.lastRegenAt;
      }

      // Sync Character with PlayerStats after regen
      await syncCharacterWithPlayerStats(
        userId,
        {
          currentHP: player.stats.currentHP,
          maxHP: player.stats.maxHP,
          currentSP: player.stats.currentSP,
          maxSP: player.stats.maxSP,
          vitality: player.stats.vitality,
          strength: player.stats.strength,
          speed: player.stats.speed,
          dexterity: player.stats.dexterity,
        },
        ctx.db
      );

      // Use battle HP/SP for combat calculations (battle state is authoritative during combat)
      const playerStats: PlayerStats = {
        vitality: player.stats.vitality,
        strength: player.stats.strength,
        speed: player.stats.speed,
        dexterity: player.stats.dexterity,
        currentHp: battle.playerHp,
        currentSp: battle.playerSp,
        maxHp: player.stats.maxHP,
        maxSp: player.stats.maxSP,
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
      let newStatus = battle.status;
      if (updatedState.monsterHp <= 0) {
        newStatus = "WON";
        // Grant rewards
        await ctx.db.player.update({
          where: { id: player.id },
          data: {
            experience: { increment: battle.monster.xpReward },
            gold: { increment: battle.monster.goldReward },
          },
        });

        // Update PvE stats
        const profile = await ctx.db.playerProfile.findUnique({
          where: { userId: player.userId },
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
                deathsUsed: player.deathCount ?? 0,
                deathsLimit: 5,
              },
            });
          }

          // Update or create PlayerLeaderboardStats
          const existingStats = await ctx.db.playerLeaderboardStats.findUnique({
            where: { userId: player.userId },
          });

          if (existingStats) {
            await ctx.db.playerLeaderboardStats.update({
              where: { userId: player.userId },
              data: {
                pveKills: { increment: 1 },
              },
            });
          } else {
            await ctx.db.playerLeaderboardStats.create({
              data: {
                userId: player.userId,
                pveKills: 1,
                pvpKills: 0,
                pvpWins: 0,
                pvpLosses: 0,
                jobXpTotal: 0,
              },
            });
          }
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
          log: updatedLog,
        },
        include: {
          monster: true,
        },
      });

      // Update player HP/SP in stats
      const updatedStats = await ctx.db.playerStats.update({
        where: { playerId: player.id },
        data: {
          currentHP: updatedState.playerHp,
          currentSP: updatedState.playerSp,
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

      if (battle.userId !== userId) {
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

      // Get player stats
      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { stats: true },
      });

      if (!player || !player.stats) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player or stats not found",
        });
      }

      // Apply regen BEFORE fleeing (server-authoritative)
      const now = new Date();
      if (!player.stats.lastRegenAt) {
        const character = await ctx.db.character.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const initialLastRegenAt = character?.createdAt 
          ? new Date(character.createdAt)
          : new Date(now.getTime() - 60000);
        
        await ctx.db.playerStats.update({
          where: { playerId: player.id },
          data: { lastRegenAt: initialLastRegenAt },
        });
        player.stats.lastRegenAt = initialLastRegenAt;
      }

      const regenResult = applyRegen(now, {
        hp: player.stats.currentHP,
        sp: player.stats.currentSP,
        maxHp: player.stats.maxHP,
        maxSp: player.stats.maxSP,
        hpRegenPerMin: player.stats.hpRegenPerMin ?? 100,
        spRegenPerMin: player.stats.spRegenPerMin ?? 100,
        lastRegenAt: player.stats.lastRegenAt,
      });

      // Update player stats if regen occurred
      if (regenResult.didUpdate) {
        await ctx.db.playerStats.update({
          where: { playerId: player.id },
          data: {
            currentHP: regenResult.hp,
            currentSP: regenResult.sp,
            lastRegenAt: regenResult.lastRegenAt,
          },
        });
        player.stats.currentHP = regenResult.hp;
        player.stats.currentSP = regenResult.sp;
        player.stats.lastRegenAt = regenResult.lastRegenAt;
      }

      // Sync Character with PlayerStats after regen
      await syncCharacterWithPlayerStats(
        userId,
        {
          currentHP: player.stats.currentHP,
          maxHP: player.stats.maxHP,
          currentSP: player.stats.currentSP,
          maxSP: player.stats.maxSP,
          vitality: player.stats.vitality,
          strength: player.stats.strength,
          speed: player.stats.speed,
          dexterity: player.stats.dexterity,
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
          log: updatedLog,
        },
        include: {
          monster: true,
        },
      });

      return updatedBattle;
    }),
});
