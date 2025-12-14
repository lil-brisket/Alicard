import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { syncPveKillsToLeaderboard } from "~/server/lib/leaderboard-sync";

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
      const player = await ctx.db.player.findUnique({
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

      const encounter = await ctx.db.encounter.findUnique({
        where: { id: input.encounterId },
      });

      if (!encounter || !encounter.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Encounter not found or already resolved",
        });
      }

      // Calculate player combat stats (base + equipment bonuses)
      const playerStats = calculateCombatStats(player.stats, player.equipment);

      // Calculate enemy stats based on type and level
      const enemyStats = calculateEnemyStats(
        encounter.enemyType,
        encounter.enemyLevel
      );

      // Determine turn order (Speed stat)
      const playerSpeed = playerStats.speed;
      const enemySpeed = enemyStats.speed;
      const playerFirst = playerSpeed >= enemySpeed;

      // Create initial combat log
      await ctx.db.combatLog.create({
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
      const player = await ctx.db.player.findUnique({
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

      const encounter = await ctx.db.encounter.findUnique({
        where: { id: input.encounterId },
      });

      if (!encounter || !encounter.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Encounter not found or already resolved",
        });
      }

      // Get latest combat state
      const latestLog = await ctx.db.combatLog.findFirst({
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

      const combatState = JSON.parse(latestLog.result ?? "{}");
      let playerHP = combatState.playerStats?.hp ?? player.stats.currentHP;
      let playerSP = combatState.playerStats?.sp ?? player.stats.currentSP;
      let enemyHP = combatState.enemyStats?.hp ?? 100;
      const turnNumber = latestLog.turnNumber + 1;

      const playerStats = calculateCombatStats(player.stats, player.equipment);
      const enemyStats = calculateEnemyStats(
        encounter.enemyType,
        encounter.enemyLevel
      );

      const combatLog: string[] = [];
      let combatEnded = false;
      let playerWon = false;

      // Player action
      switch (input.action) {
        case "attack": {
          const damage = calculateDamage(playerStats.strength, enemyStats.defense);
          enemyHP = Math.max(0, enemyHP - damage);
          combatLog.push(
            `You attack the ${encounter.enemyType} for ${damage} damage!`
          );
          if (enemyHP <= 0) {
            combatEnded = true;
            playerWon = true;
            combatLog.push(`You defeated the ${encounter.enemyType}!`);
          }
          break;
        }
        case "defend": {
          // Defend reduces incoming damage by 50% for this turn
          combatLog.push("You take a defensive stance!");
          break;
        }
        case "skill": {
          if (!input.skillName) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Skill name required for skill action",
            });
          }
          const skill = player.skills.find((s) => s.skill.name === input.skillName);
          if (!skill) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Skill not found",
            });
          }
          // Basic skill implementation - Power Strike
          if (input.skillName === "Power Strike") {
            if (playerSP < 10) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Not enough stamina",
              });
            }
            playerSP -= 10;
            const damage = calculateDamage(
              playerStats.strength * 1.5,
              enemyStats.defense
            );
            enemyHP = Math.max(0, enemyHP - damage);
            combatLog.push(
              `You use Power Strike for ${damage} damage! (SP: ${playerSP}/${playerStats.maxSP})`
            );
            if (enemyHP <= 0) {
              combatEnded = true;
              playerWon = true;
              combatLog.push(`You defeated the ${encounter.enemyType}!`);
            }
          }
          break;
        }
        case "escape": {
          const escapeChance = calculateEscapeChance(
            playerStats.speed,
            enemyStats.speed
          );
          if (Math.random() < escapeChance) {
            combatEnded = true;
            combatLog.push("You successfully escaped!");
          } else {
            combatLog.push("You failed to escape!");
          }
          break;
        }
        case "item": {
          // Item usage would be implemented here
          combatLog.push("Item usage not yet implemented");
          break;
        }
      }

      // Enemy action (if combat not ended)
      if (!combatEnded) {
        const enemyDamage = calculateDamage(enemyStats.strength, playerStats.defense);
        playerHP = Math.max(0, playerHP - enemyDamage);
        combatLog.push(
          `The ${encounter.enemyType} attacks you for ${enemyDamage} damage! (HP: ${playerHP}/${playerStats.maxHP})`
        );

        if (playerHP <= 0) {
          combatEnded = true;
          playerWon = false;
          combatLog.push("You have been defeated!");
        }
      }

      // Save combat log
      await ctx.db.combatLog.create({
        data: {
          playerId: player.id,
          encounterId: encounter.id,
          turnNumber,
          action: input.action,
          result: JSON.stringify({
            messages: combatLog,
            playerStats: {
              hp: playerHP,
              maxHP: playerStats.maxHP,
              sp: playerSP,
              maxSP: playerStats.maxSP,
            },
            enemyStats: {
              hp: enemyHP,
              maxHP: enemyStats.maxHP,
            },
            combatEnded,
            playerWon,
          }),
        },
      });

      // Update player HP/SP
      const updatedStats = await ctx.db.playerStats.update({
        where: { playerId: player.id },
        data: {
          currentHP: playerHP,
          currentSP: playerSP,
        },
      });

      // Sync Character model with PlayerStats
      // Use updatedStats from database (base values) not playerStats (calculated with equipment)
      await syncCharacterWithPlayerStats(
        player.userId,
        {
          currentHP: playerHP,
          maxHP: updatedStats.maxHP,
          currentSP: playerSP,
          maxSP: updatedStats.maxSP,
          vitality: updatedStats.vitality,
          strength: updatedStats.strength,
          speed: updatedStats.speed,
          dexterity: updatedStats.dexterity,
        },
        ctx.db
      );

      // Handle combat end
      if (combatEnded) {
        await ctx.db.encounter.update({
          where: { id: encounter.id },
          data: { isActive: false },
        });

        if (playerWon) {
          // Award experience and gold
          const expGain = encounter.enemyLevel * 10;
          const goldGain = Math.floor(Math.random() * encounter.enemyLevel * 5) + encounter.enemyLevel;

          await ctx.db.player.update({
            where: { id: player.id },
            data: {
              experience: { increment: expGain },
              gold: { increment: goldGain },
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

            // Sync PvE kills from profile to leaderboard
            await syncPveKillsToLeaderboard(player.userId, ctx.db);
          }

          combatLog.push(`You gained ${expGain} experience and ${goldGain} gold!`);
        } else {
          // Handle death
          await handlePlayerDeath(player.id, ctx.db);
        }
      }

      return {
        turnNumber,
        messages: combatLog,
        playerStats: {
          hp: playerHP,
          maxHP: playerStats.maxHP,
          sp: playerSP,
          maxSP: playerStats.maxSP,
        },
        enemyStats: {
          hp: enemyHP,
          maxHP: enemyStats.maxHP,
        },
        combatEnded,
        playerWon,
      };
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
    // Log error but don't throw - we don't want to break combat if sync fails
    console.error(`Error syncing Character with PlayerStats for userId ${userId}:`, error);
  }
}

// Helper functions
function calculateCombatStats(stats: any, equipment: any) {
  let vitality = stats.vitality;
  let strength = stats.strength;
  let speed = stats.speed;
  let dexterity = stats.dexterity;
  let defense = Math.floor(vitality * 0.5);

  // Add equipment bonuses
  if (equipment) {
    const equipmentItems = [
      equipment.weapon,
      equipment.head,
      equipment.chest,
      equipment.legs,
      equipment.feet,
      equipment.accessory1,
      equipment.accessory2,
    ].filter(Boolean);

    for (const item of equipmentItems) {
      vitality += item.vitalityBonus;
      strength += item.strengthBonus;
      speed += item.speedBonus;
      dexterity += item.dexterityBonus;
      defense += Math.floor(item.vitalityBonus * 0.5);
    }
  }

  return {
    vitality,
    strength,
    speed,
    dexterity,
    defense,
    currentHP: stats.currentHP,
    maxHP: 50 + vitality * 5,
    currentSP: stats.currentSP,
    maxSP: 20 + vitality * 2 + speed * 1,
  };
}

function calculateEnemyStats(enemyType: string, level: number) {
  const baseStats: Record<string, { hp: number; strength: number; speed: number; defense: number }> = {
    Wolf: { hp: 20, strength: 5, speed: 8, defense: 2 },
    Goblin: { hp: 15, strength: 4, speed: 6, defense: 1 },
    Bandit: { hp: 25, strength: 6, speed: 5, defense: 3 },
    Skeleton: { hp: 30, strength: 7, speed: 4, defense: 4 },
    Orc: { hp: 40, strength: 10, speed: 3, defense: 5 },
  };

  const base = baseStats[enemyType] ?? baseStats["Wolf"]!;
  const multiplier = 1 + (level - 1) * 0.3;

  return {
    hp: Math.floor(base.hp * multiplier),
    maxHP: Math.floor(base.hp * multiplier),
    strength: Math.floor(base.strength * multiplier),
    speed: Math.floor(base.speed * multiplier),
    defense: Math.floor(base.defense * multiplier),
  };
}

function calculateDamage(attack: number, defense: number): number {
  const baseDamage = attack;
  const mitigated = Math.floor(defense * 0.5);
  const damage = Math.max(1, baseDamage - mitigated);
  // Add some randomness (±20%)
  const variance = damage * 0.2;
  return Math.floor(damage + (Math.random() * variance * 2 - variance));
}

function calculateEscapeChance(playerSpeed: number, enemySpeed: number): number {
  const speedDiff = playerSpeed - enemySpeed;
  const baseChance = 0.3;
  const speedBonus = Math.min(0.4, speedDiff * 0.05);
  return Math.min(0.9, baseChance + speedBonus);
}

async function handlePlayerDeath(playerId: string, db: any) {
  const player = await db.player.findUnique({
    where: { id: playerId },
  });

  if (!player) return;

  const newDeathCount = player.deathCount + 1;

  // Log death
  await db.deathLog.create({
    data: {
      playerId,
      deathCount: newDeathCount,
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

