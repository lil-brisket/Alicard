import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  calculateCombatStats,
  calculateEnemyStats,
  determineTurnOrder,
  executeCombatAction,
} from "~/server/game/combat/engine";
import {
  finalizeCombatVictory,
  finalizeCombatDefeat,
  updatePlayerStats,
} from "~/server/game/combat/finalize";
import type { Equipment, PlayerBaseStats } from "~/server/game/combat/types";

// Combat action types
const combatActionSchema = z.enum([
  "attack",
  "skill",
  "defend",
  "item",
  "escape",
]);

export const combatRouter = createTRPCRouter({
  // Start combat with an encounter
  // TODO: rate limit combat start (e.g., max 5 combat starts per minute)
  startCombat: protectedProcedure
    .input(
      z.object({
        encounterId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        const player = await tx.player.findUnique({
          where: { userId: ctx.session.user.id },
          include: {
            stats: true,
            equipment: {
              include: {
                head: true,
                leftArm: true,
                rightArm: true,
                body: true,
                legs: true,
                feet: true,
                ring1: true,
                ring2: true,
                ring3: true,
                necklace: true,
                belt: true,
                cloak: true,
              },
            },
          },
        });

        if (!player || player.isDeleted || !player.stats) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Character not found",
          });
        }

        const encounter = await tx.encounter.findUnique({
          where: { id: input.encounterId },
        });

        if (!encounter || !encounter.isActive) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Encounter not found or already resolved",
          });
        }

        // Calculate player combat stats (base + equipment bonuses)
        const playerStats = calculateCombatStats(
          player.stats as PlayerBaseStats,
          player.equipment as Equipment | null
        );

        // Calculate enemy stats based on type and level
        const enemyStats = calculateEnemyStats(
          encounter.enemyType,
          encounter.enemyLevel
        );

        // Determine turn order (Speed stat)
        const playerFirst = determineTurnOrder(
          playerStats.speed,
          enemyStats.speed
        );

        // Create initial combat log
        await tx.combatLog.create({
          data: {
            playerId: player.id,
            encounterId: encounter.id,
            turnNumber: 0,
            action: "combat_start",
            result: JSON.stringify({
              message: `Combat begins! You face a level ${encounter.enemyLevel} ${encounter.enemyType}.`,
              playerFirst,
              playerStats: {
                hp: playerStats.currentHP,
                maxHP: playerStats.maxHP,
                sp: playerStats.currentSP,
                maxSP: playerStats.maxSP,
              },
              enemyStats: {
                hp: enemyStats.hp,
                maxHP: enemyStats.maxHP,
                type: encounter.enemyType,
                level: encounter.enemyLevel,
              },
            }),
          },
        });

        // Audit log
        await tx.auditEvent.create({
          data: {
            actorUserId: ctx.session.user.id,
            actorCharacterId: player.id,
            type: "COMBAT_START",
            payloadJson: {
              encounterId: encounter.id,
              enemyType: encounter.enemyType,
              enemyLevel: encounter.enemyLevel,
            },
          },
        });

        return {
          encounterId: encounter.id,
          playerFirst,
          playerStats: {
            hp: playerStats.currentHP,
            maxHP: playerStats.maxHP,
            sp: playerStats.currentSP,
            maxSP: playerStats.maxSP,
          },
          enemyStats: {
            hp: enemyStats.hp,
            maxHP: enemyStats.maxHP,
            type: encounter.enemyType,
            level: encounter.enemyLevel,
          },
        };
      });
    }),

  // Execute combat action
  // TODO: rate limit combat actions (e.g., max 10 actions per second, 300 per minute)
  // This prevents combat spam and ensures fair turn-based gameplay
  executeAction: protectedProcedure
    .input(
      z.object({
        encounterId: z.string(),
        action: combatActionSchema,
        skillName: z.string().optional(),
        itemId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Re-read player state (important for concurrency)
        const player = await tx.player.findUnique({
          where: { userId: ctx.session.user.id },
          include: {
            stats: true,
            equipment: {
              include: {
                head: true,
                leftArm: true,
                rightArm: true,
                body: true,
                legs: true,
                feet: true,
                ring1: true,
                ring2: true,
                ring3: true,
                necklace: true,
                belt: true,
                cloak: true,
              },
            },
            skills: {
              include: {
                skill: true,
              },
            },
          },
        });

        if (!player || player.isDeleted || !player.stats) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Character not found",
          });
        }

        const encounter = await tx.encounter.findUnique({
          where: { id: input.encounterId },
        });

        if (!encounter || !encounter.isActive) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Encounter not found or already resolved",
          });
        }

        // Get latest combat state
        const latestLog = await tx.combatLog.findFirst({
          where: {
            encounterId: encounter.id,
            playerId: player.id,
          },
          orderBy: { turnNumber: "desc" },
        });

        if (!latestLog) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Combat not started",
          });
        }

        const combatStateFromLog = JSON.parse(latestLog.result ?? "{}");
        const currentState = {
          playerHP:
            combatStateFromLog.playerStats?.hp ?? player.stats.currentHP,
          playerSP:
            combatStateFromLog.playerStats?.sp ?? player.stats.currentSP,
          enemyHP: combatStateFromLog.enemyStats?.hp ?? 100,
          turnNumber: latestLog.turnNumber, // Engine will increment this
          combatEnded: false,
          playerWon: null as boolean | null,
        };

        // Calculate stats using engine
        const playerStats = calculateCombatStats(
          player.stats as PlayerBaseStats,
          player.equipment as Equipment | null
        );
        const enemyStats = calculateEnemyStats(
          encounter.enemyType,
          encounter.enemyLevel
        );

        // Determine skill cost if using skill
        let skillStaminaCost: number | undefined;
        if (input.action === "skill") {
          if (!input.skillName) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Skill name required for skill action",
            });
          }
          const playerSkill = player.skills.find(
            (s) => s.skill.name === input.skillName
          );
          if (!playerSkill) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Skill not found",
            });
          }
          // For now, hardcode Power Strike cost
          if (input.skillName === "Power Strike") {
            skillStaminaCost = 10;
          } else {
            skillStaminaCost = playerSkill.skill.staminaCost;
          }
        }

        // Execute combat action using pure engine function
        const result = executeCombatAction(
          input.action,
          currentState,
          playerStats,
          enemyStats,
          input.skillName,
          skillStaminaCost
        );

        // Save combat log
        await tx.combatLog.create({
          data: {
            playerId: player.id,
            encounterId: encounter.id,
            turnNumber: result.state.turnNumber,
            action: input.action,
            result: JSON.stringify({
              messages: result.messages,
              playerStats: {
                hp: result.state.playerHP,
                maxHP: playerStats.maxHP,
                sp: result.state.playerSP,
                maxSP: playerStats.maxSP,
              },
              enemyStats: {
                hp: result.state.enemyHP,
                maxHP: enemyStats.maxHP,
              },
              combatEnded: result.state.combatEnded,
              playerWon: result.state.playerWon,
            }),
          },
        });

        // Update player HP/SP
        await updatePlayerStats(
          player.id,
          player.userId,
          result.state,
          playerStats.maxHP,
          playerStats.maxSP,
          tx
        );

        // Handle combat end
        if (result.state.combatEnded) {
          await tx.encounter.update({
            where: { id: encounter.id },
            data: { isActive: false },
          });

          if (result.state.playerWon === true) {
            // Award experience and gold
            const rewards = await finalizeCombatVictory(
              player.id,
              player.userId,
              encounter.enemyLevel,
              tx
            );
            result.messages.push(
              `You gained ${rewards.expGain} experience and ${rewards.goldGain} gold!`
            );
          } else if (result.state.playerWon === false) {
            // Handle death
            await finalizeCombatDefeat(player.id, tx);
          }
        }

        // Audit log
        await tx.auditEvent.create({
          data: {
            actorUserId: ctx.session.user.id,
            actorCharacterId: player.id,
            type: "COMBAT_ACTION",
            payloadJson: {
              encounterId: encounter.id,
              action: input.action,
              skillName: input.skillName,
              turnNumber: result.state.turnNumber,
              combatEnded: result.state.combatEnded,
              playerWon: result.state.playerWon,
            },
          },
        });

        return {
          turnNumber: result.state.turnNumber,
          messages: result.messages,
          playerStats: {
            hp: result.state.playerHP,
            maxHP: playerStats.maxHP,
            sp: result.state.playerSP,
            maxSP: playerStats.maxSP,
          },
          enemyStats: {
            hp: result.state.enemyHP,
            maxHP: enemyStats.maxHP,
          },
          combatEnded: result.state.combatEnded,
          playerWon: result.state.playerWon,
        };
      });
    }),

  // Get combat log
  getCombatLog: protectedProcedure
    .input(
      z.object({
        encounterId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      }

      const logs = await ctx.db.combatLog.findMany({
        where: {
          playerId: player.id,
          encounterId: input.encounterId,
        },
        orderBy: { turnNumber: "asc" },
      });

      return logs.map((log) => ({
        turnNumber: log.turnNumber,
        action: log.action,
        result: JSON.parse(log.result ?? "{}"),
        createdAt: log.createdAt,
      }));
    }),
});
