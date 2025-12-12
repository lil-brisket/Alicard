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

export const battleRouter = createTRPCRouter({
  // List all available monster templates
  listMonsters: protectedProcedure.query(async ({ ctx }) => {
    const monsters = await ctx.db.monster.findMany({
      orderBy: { level: "asc" },
    });

    return monsters;
  }),

  // Start a new battle with a monster
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

      // Create battle with snapshot of HP/SP
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

      // Prepare stats for engine
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
      await ctx.db.playerStats.update({
        where: { playerId: player.id },
        data: {
          currentHP: updatedState.playerHp,
          currentSP: updatedState.playerSp,
        },
      });

      return updatedBattle;
    }),

  // Flee from battle
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
