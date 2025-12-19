import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { addXp } from "~/server/lib/job-utils";

/**
 * Melvor Idle-inspired skill training system router
 * 
 * Core philosophy:
 * - Skills function as long-term jobs (no classes)
 * - Players can train all skills, time investment matters
 * - Skills progress by repeating actions over time
 * - Each action grants XP and produces items/effects
 * - Higher levels improve efficiency and unlock new actions
 */

export const skillTrainingRouter = createTRPCRouter({
  // List all available training skills (public for browsing)
  listSkills: publicProcedure
    .input(
      z
        .object({
          category: z.enum(["GATHERING", "PROCESSING", "COMBAT", "UTILITY"]).optional(),
          status: z.enum(["DRAFT", "ACTIVE", "DISABLED"]).optional(),
          jobId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.trainingSkill.findMany({
        where: {
          ...(input?.category && { category: input.category }),
          ...(input?.status && { status: input.status }),
          ...(input?.jobId && { jobId: input.jobId }),
        },
        orderBy: [
          { category: "asc" },
          { name: "asc" },
        ],
        include: {
          job: true,
          actions: {
            where: {
              status: "ACTIVE", // Only show active actions by default
            },
            orderBy: { requiredLevel: "asc" },
            include: {
              inputItems: {
                include: { item: true },
              },
              outputItems: {
                include: { item: true },
              },
            },
          },
        },
      });
    }),

  // Get player's training skills (create missing ones on first access)
  getMySkills: protectedProcedure
    .input(
      z
        .object({
          jobId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Get all active skills (optionally filtered by job)
      const allSkills = await ctx.db.trainingSkill.findMany({
        where: {
          status: "ACTIVE",
          ...(input?.jobId && { jobId: input.jobId }),
        },
      });

    // Get player's existing skills
    const playerSkills = await ctx.db.playerTrainingSkill.findMany({
      where: { playerId: player.id },
      include: { skill: true },
    });

    const playerSkillMap = new Map(
      playerSkills.map((ps) => [ps.skillId, ps])
    );

    // Auto-create missing skills (default level 1, 0 XP)
    const skillsToCreate = allSkills.filter(
      (skill) => !playerSkillMap.has(skill.id)
    );

    if (skillsToCreate.length > 0) {
      await ctx.db.playerTrainingSkill.createMany({
        data: skillsToCreate.map((skill) => ({
          playerId: player.id,
          skillId: skill.id,
          level: 1,
          xp: 0,
        })),
      });
    }

      // Fetch all player skills with full skill details
      const allPlayerSkills = await ctx.db.playerTrainingSkill.findMany({
        where: { playerId: player.id },
        include: {
          skill: {
            include: {
              job: true,
              actions: {
                where: { status: "ACTIVE" },
                orderBy: { requiredLevel: "asc" },
                include: {
                  inputItems: {
                    include: { item: true },
                  },
                  outputItems: {
                    include: { item: true },
                  },
                },
              },
            },
          },
        },
      });

    // Return skills without XP tracking (skills are just organizational now)
    return allPlayerSkills.map((ps) => ({
      ...ps,
      progress: { current: 0, needed: 0, progressPct: 0 }, // Placeholder, not used
    }));
  }),

  // Get specific skill details
  getSkill: publicProcedure
    .input(z.object({ skillId: z.string() }))
    .query(async ({ ctx, input }) => {
      const skill = await ctx.db.trainingSkill.findUnique({
        where: { id: input.skillId },
        include: {
          job: true,
          actions: {
            where: { status: "ACTIVE" },
            orderBy: { requiredLevel: "asc" },
            include: {
              inputItems: {
                include: { item: true },
              },
              outputItems: {
                include: { item: true },
              },
            },
          },
        },
      });

      if (!skill) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill not found",
        });
      }

      return skill;
    }),

  // Get training skills for a specific job
  getSkillsByJob: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.trainingSkill.findMany({
        where: {
          jobId: input.jobId,
          status: "ACTIVE",
        },
        include: {
          job: true,
          actions: {
            where: { status: "ACTIVE" },
            orderBy: { requiredLevel: "asc" },
            include: {
              inputItems: {
                include: { item: true },
              },
              outputItems: {
                include: { item: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  // Start a training action (locks player into action loop)
  startAction: protectedProcedure
    .input(z.object({ actionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          stats: true,
          activeTrainingAction: {
            include: { action: true },
          },
        },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Check if player already has an active action
      if (player.activeTrainingAction) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Already training: ${player.activeTrainingAction.action.name}. Stop current action first.`,
        });
      }

      // Get action details
      const action = await ctx.db.skillAction.findUnique({
        where: { id: input.actionId },
        include: {
          skill: true,
          inputItems: {
            include: { item: true },
          },
          outputItems: {
            include: { item: true },
          },
        },
      });

      if (!action || action.status !== "ACTIVE") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Action not found or not available",
        });
      }

      // Check job level requirement (skills are just organizational, job level is what matters)
      if (action.skill.jobId) {
        const userJob = await ctx.db.userJob.findUnique({
          where: {
            playerId_jobId: {
              playerId: player.id,
              jobId: action.skill.jobId,
            },
          },
        });

        if (!userJob || userJob.level < action.requiredLevel) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Requires job level ${action.requiredLevel}`,
          });
        }
      }

      // Ensure player has the skill record (for organizational purposes)
      const playerSkill = await ctx.db.playerTrainingSkill.findUnique({
        where: {
          playerId_skillId: {
            playerId: player.id,
            skillId: action.skillId,
          },
        },
      });

      if (!playerSkill) {
        // Create skill record if missing
        await ctx.db.playerTrainingSkill.create({
          data: {
            playerId: player.id,
            skillId: action.skillId,
            level: 1,
            xp: 0,
          },
        });
      }

      // Check if player has required input items
      if (action.inputItems.length > 0) {
        const inventoryItems = await ctx.db.inventoryItem.findMany({
          where: { playerId: player.id },
          include: { item: true },
        });

        const inventoryMap = new Map(
          inventoryItems.map((ii) => [ii.itemId, ii.quantity])
        );

        for (const inputItem of action.inputItems) {
          const available = inventoryMap.get(inputItem.itemId) ?? 0;
          if (available < inputItem.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Not enough ${inputItem.item.name}. Need ${inputItem.quantity}, have ${available}`,
            });
          }
        }
      }

      // Check stamina if required
      if (action.staminaCost > 0 && player.stats) {
        if (player.stats.currentSP < action.staminaCost) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Not enough stamina. Need ${action.staminaCost}, have ${player.stats.currentSP}`,
          });
        }
      }

      // Create active action
      const now = new Date();
      const nextCompletionAt = new Date(now.getTime() + action.actionTimeSeconds * 1000);

      const activeAction = await ctx.db.playerActiveAction.create({
        data: {
          playerId: player.id,
          actionId: action.id,
          startedAt: now,
          nextCompletionAt,
          actionsCompleted: 0,
        },
      });

      return {
        activeAction,
        action,
        nextCompletionAt,
      };
    }),

  // Stop current training action
  stopAction: protectedProcedure.mutation(async ({ ctx }) => {
    const player = await ctx.db.player.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!player) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Player not found",
      });
    }

    const activeAction = await ctx.db.playerActiveAction.findUnique({
      where: { playerId: player.id },
      include: { action: true },
    });

    if (!activeAction) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active training action",
      });
    }

    await ctx.db.playerActiveAction.delete({
      where: { id: activeAction.id },
    });

    return {
      success: true,
      message: `Stopped training: ${activeAction.action.name}`,
    };
  }),

  // Get current active action status (automatically processes offline completions)
  getActiveAction: protectedProcedure.query(async ({ ctx }) => {
    const player = await ctx.db.player.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        stats: true,
      },
    });

    if (!player) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Player not found",
      });
    }

    let activeAction = await ctx.db.playerActiveAction.findUnique({
      where: { playerId: player.id },
      include: {
        action: {
          include: {
            skill: true,
            inputItems: {
              include: { item: true },
            },
            outputItems: {
              include: { item: true },
            },
          },
        },
      },
    });

    if (!activeAction) {
      return null;
    }

    const now = new Date();
    
    // Process all offline completions (continue training while away)
    // This allows training to continue even when the player is offline
    // Safety limit: process max 1000 actions at once to prevent infinite loops or excessive processing
    let processedCount = 0;
    const maxOfflineActions = 1000;
    
    while (activeAction.nextCompletionAt <= now && processedCount < maxOfflineActions) {
      processedCount++;
      // Check if action can succeed (success rate roll)
      const success =
        activeAction.action.successRate >= 1.0 ||
        Math.random() < activeAction.action.successRate;

      // Get player skill for XP calculation
      const playerSkill = await ctx.db.playerTrainingSkill.findUnique({
        where: {
          playerId_skillId: {
            playerId: player.id,
            skillId: activeAction.action.skillId,
          },
        },
      });

      if (!playerSkill) {
        // Skill not found, stop action
        await ctx.db.playerActiveAction.delete({
          where: { id: activeAction.id },
        });
        return null;
      }

      if (success) {
        // Consume input items
        let hasEnoughItems = true;
        for (const inputItem of activeAction.action.inputItems) {
          const inventoryItem = await ctx.db.inventoryItem.findUnique({
            where: {
              playerId_itemId: {
                playerId: player.id,
                itemId: inputItem.itemId,
              },
            },
          });

          if (!inventoryItem || inventoryItem.quantity < inputItem.quantity) {
            // Not enough items - stop action
            await ctx.db.playerActiveAction.delete({
              where: { id: activeAction.id },
            });
            return null;
          }

          // Remove items
          if (inventoryItem.quantity === inputItem.quantity) {
            await ctx.db.inventoryItem.delete({
              where: { id: inventoryItem.id },
            });
          } else {
            await ctx.db.inventoryItem.update({
              where: { id: inventoryItem.id },
              data: { quantity: inventoryItem.quantity - inputItem.quantity },
            });
          }
        }

        // Grant XP to job (primary progression system)
        const xpGained = activeAction.action.xpReward;
        if (activeAction.action.skill.jobId) {
          const userJob = await ctx.db.userJob.findUnique({
            where: {
              playerId_jobId: {
                playerId: player.id,
                jobId: activeAction.action.skill.jobId,
              },
            },
          });

          if (userJob) {
            const jobXpResult = addXp(userJob.level, userJob.xp, xpGained, 10);
            await ctx.db.userJob.update({
              where: { id: userJob.id },
              data: {
                level: jobXpResult.newLevel,
                xp: jobXpResult.newXp,
              },
            });
          }
        }

        // Grant output items
        for (const outputItem of activeAction.action.outputItems) {
          const quantity =
            outputItem.minQuantity +
            Math.floor(
              Math.random() * (outputItem.maxQuantity - outputItem.minQuantity + 1)
            );

          if (quantity > 0) {
            const existingItem = await ctx.db.inventoryItem.findUnique({
              where: {
                playerId_itemId: {
                  playerId: player.id,
                  itemId: outputItem.itemId,
                },
              },
            });

            if (existingItem) {
              await ctx.db.inventoryItem.update({
                where: { id: existingItem.id },
                data: {
                  quantity: existingItem.quantity + quantity,
                },
              });
            } else {
              await ctx.db.inventoryItem.create({
                data: {
                  playerId: player.id,
                  itemId: outputItem.itemId,
                  quantity,
                },
              });
            }
          }
        }

        // Log the action
        await ctx.db.skillActionLog.create({
          data: {
            playerId: player.id,
            actionId: activeAction.action.id,
            skillId: activeAction.action.skillId,
            success: true,
            xpGained,
          },
        });
      } else {
        // Log failed action
        await ctx.db.skillActionLog.create({
          data: {
            playerId: player.id,
            actionId: activeAction.action.id,
            skillId: activeAction.action.skillId,
            success: false,
            xpGained: 0,
          },
        });
      }

      // Update active action for next completion
      const nextCompletionAt = new Date(
        activeAction.nextCompletionAt.getTime() + activeAction.action.actionTimeSeconds * 1000
      );

      await ctx.db.playerActiveAction.update({
        where: { id: activeAction.id },
        data: {
          nextCompletionAt,
          actionsCompleted: activeAction.actionsCompleted + 1,
          updatedAt: now,
        },
      });

      // Refetch to get updated action
      activeAction = await ctx.db.playerActiveAction.findUnique({
        where: { playerId: player.id },
        include: {
          action: {
            include: {
              skill: true,
              inputItems: {
                include: { item: true },
              },
              outputItems: {
                include: { item: true },
              },
            },
          },
        },
      });

      if (!activeAction) {
        return null;
      }
    }

    const timeUntilCompletion =
      activeAction.nextCompletionAt.getTime() - now.getTime();
    const isReady = timeUntilCompletion <= 0;

    return {
      ...activeAction,
      isReady,
      timeUntilCompletion: Math.max(0, timeUntilCompletion),
      progressPct: activeAction.action.actionTimeSeconds > 0
        ? Math.max(
            0,
            Math.min(
              100,
              ((activeAction.action.actionTimeSeconds * 1000 - timeUntilCompletion) /
                (activeAction.action.actionTimeSeconds * 1000)) *
                100
            )
          )
        : 100,
    };
  }),

  // Complete an action (called when action time elapses)
  // This simulates the action loop - in production, this would be called by a background job/cron
  completeAction: protectedProcedure.mutation(async ({ ctx }) => {
    const player = await ctx.db.player.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        stats: true,
      },
    });

    if (!player) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Player not found",
      });
    }

    const activeAction = await ctx.db.playerActiveAction.findUnique({
      where: { playerId: player.id },
      include: {
        action: {
          include: {
            skill: true,
            inputItems: {
              include: { item: true },
            },
            outputItems: {
              include: { item: true },
            },
          },
        },
      },
    });

    if (!activeAction) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active training action",
      });
    }

    const now = new Date();
    if (activeAction.nextCompletionAt > now) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Action not ready yet",
      });
    }

    // Check if action can succeed (success rate roll)
    const success =
      activeAction.action.successRate >= 1.0 ||
      Math.random() < activeAction.action.successRate;

    // Get player skill for XP calculation
    const playerSkill = await ctx.db.playerTrainingSkill.findUnique({
      where: {
        playerId_skillId: {
          playerId: player.id,
          skillId: activeAction.action.skillId,
        },
      },
    });

    if (!playerSkill) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Player skill not found",
      });
    }

    let xpGained = 0;
    const itemsConsumed: Array<{ itemId: string; quantity: number }> = [];
    const itemsGained: Array<{ itemId: string; quantity: number }> = [];

    if (success) {
      // Consume input items
      for (const inputItem of activeAction.action.inputItems) {
        // Find inventory item
        const inventoryItem = await ctx.db.inventoryItem.findUnique({
          where: {
            playerId_itemId: {
              playerId: player.id,
              itemId: inputItem.itemId,
            },
          },
        });

        if (!inventoryItem || inventoryItem.quantity < inputItem.quantity) {
          // Not enough items - stop action
          await ctx.db.playerActiveAction.delete({
            where: { id: activeAction.id },
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Not enough ${inputItem.item.name}. Action stopped.`,
          });
        }

        // Remove items
        if (inventoryItem.quantity === inputItem.quantity) {
          await ctx.db.inventoryItem.delete({
            where: { id: inventoryItem.id },
          });
        } else {
          await ctx.db.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: { quantity: inventoryItem.quantity - inputItem.quantity },
          });
        }

        itemsConsumed.push({
          itemId: inputItem.itemId,
          quantity: inputItem.quantity,
        });
      }

      // Consume stamina if required
      if (activeAction.action.staminaCost > 0 && player.stats) {
        const newSP = Math.max(0, player.stats.currentSP - activeAction.action.staminaCost);
        await ctx.db.playerStats.update({
          where: { id: player.stats.id },
          data: { currentSP: newSP },
        });

        // Stop action if stamina depleted
        if (newSP === 0) {
          await ctx.db.playerActiveAction.delete({
            where: { id: activeAction.id },
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stamina depleted. Action stopped.",
          });
        }
      }

      // Grant XP to job (primary progression system)
      xpGained = activeAction.action.xpReward;
      let jobLeveledUp = false;
      if (success && activeAction.action.skill.jobId) {
        const userJob = await ctx.db.userJob.findUnique({
          where: {
            playerId_jobId: {
              playerId: player.id,
              jobId: activeAction.action.skill.jobId,
            },
          },
        });

        if (userJob) {
          const jobXpResult = addXp(userJob.level, userJob.xp, xpGained, 10);
          jobLeveledUp = jobXpResult.leveledUp;
          await ctx.db.userJob.update({
            where: { id: userJob.id },
            data: {
              level: jobXpResult.newLevel,
              xp: jobXpResult.newXp,
            },
          });
        }
      }

      // Grant output items
      for (const outputItem of activeAction.action.outputItems) {
        // Random quantity between min and max
        const quantity =
          outputItem.minQuantity +
          Math.floor(
            Math.random() * (outputItem.maxQuantity - outputItem.minQuantity + 1)
          );

        if (quantity > 0) {
          // Find or create inventory item
          const existingItem = await ctx.db.inventoryItem.findUnique({
            where: {
              playerId_itemId: {
                playerId: player.id,
                itemId: outputItem.itemId,
              },
            },
          });

          if (existingItem) {
            await ctx.db.inventoryItem.update({
              where: { id: existingItem.id },
              data: {
                quantity: existingItem.quantity + quantity,
              },
            });
          } else {
            await ctx.db.inventoryItem.create({
              data: {
                playerId: player.id,
                itemId: outputItem.itemId,
                quantity,
              },
            });
          }

          itemsGained.push({
            itemId: outputItem.itemId,
            quantity,
          });
        }
      }
    }

    // Log the action
    await ctx.db.skillActionLog.create({
      data: {
        playerId: player.id,
        actionId: activeAction.action.id,
        skillId: activeAction.action.skillId,
        success,
        xpGained,
        itemsConsumedJSON: itemsConsumed.length > 0 ? itemsConsumed : null,
        itemsGainedJSON: itemsGained.length > 0 ? itemsGained : null,
      },
    });

    // Update active action for next completion
    const nextCompletionAt = new Date(
      now.getTime() + activeAction.action.actionTimeSeconds * 1000
    );

    await ctx.db.playerActiveAction.update({
      where: { id: activeAction.id },
      data: {
        nextCompletionAt,
        actionsCompleted: activeAction.actionsCompleted + 1,
        updatedAt: now,
      },
    });

    return {
      success,
      xpGained,
      itemsConsumed,
      itemsGained,
      leveledUp: jobLeveledUp,
      nextCompletionAt,
      actionsCompleted: activeAction.actionsCompleted + 1,
    };
  }),
});
