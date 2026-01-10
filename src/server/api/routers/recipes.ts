import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { addItemToInventory, hasItem, removeItemFromInventory } from "~/server/lib/inventory";
import {
  getLevelFromXp,
  getMaxXpForLevel,
  addXp,
} from "~/server/lib/job-utils";
import { checkRateLimit } from "~/server/lib/rate-limit";

// Calculate crafting success chance
// Success chance = clamp(0.2, 0.95, 0.55 + (jobLevel - difficulty)*0.07)
// If recipe.successRate is provided (not null), use that instead of calculating
function calculateSuccessChance(
  jobLevel: number,
  difficulty: number,
  recipeSuccessRate: number | null | undefined
): number {
  // Use recipe's successRate if provided (data-driven override)
  if (recipeSuccessRate !== null && recipeSuccessRate !== undefined) {
    return Math.max(0.0, Math.min(1.0, recipeSuccessRate));
  }

  // Otherwise calculate based on level and difficulty
  const base = 0.55 + (jobLevel - difficulty) * 0.07;
  return Math.max(0.2, Math.min(0.95, base));
}

// Calculate XP gained from crafting
function getCraftXp(success: boolean, difficulty: number): number {
  if (success) {
    return 15 + difficulty * 5;
  } else {
    return 5 + difficulty * 2;
  }
}

export const recipesRouter = createTRPCRouter({
  // List all recipes (optional filter by job)
  listRecipes: publicProcedure
    .input(
      z.object({
        jobKey: z.string().optional(),
        jobId: z.string().optional(),
        difficultyMax: z.number().int().min(1).max(10).optional(),
        search: z.string().optional(),
        playerLevel: z.number().int().min(1).optional(), // Filter by player's job level
      }).optional()
    )
    .query(async ({ input }) => {
      const where: {
        jobId?: string;
        difficulty?: { lte: number };
        name?: { contains: string; mode?: "insensitive" };
        requiredJobLevel?: { lte: number };
      } = {};
      
      if (input?.jobKey) {
        const job = await db.job.findUnique({ where: { key: input.jobKey } });
        if (job) {
          where.jobId = job.id;
        }
      } else if (input?.jobId) {
        where.jobId = input.jobId;
      }
      
      if (input?.difficultyMax !== undefined) {
        where.difficulty = { lte: input.difficultyMax };
      }
      
      if (input?.search) {
        where.name = { contains: input.search, mode: "insensitive" };
      }
      
      // Filter by player level if provided
      if (input?.playerLevel !== undefined) {
        where.requiredJobLevel = { lte: input.playerLevel };
      }
      
      return await db.recipe.findMany({
        where,
        include: {
          job: true,
          outputItem: true,
          inputs: {
            include: {
              item: true,
            },
          },
        },
        orderBy: { difficulty: "asc" },
      });
    }),

  // Get recipe by ID
  getRecipe: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const recipe = await db.recipe.findUnique({
        where: { id: input.id },
        include: {
          job: true,
          outputItem: true,
          inputs: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!recipe) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recipe not found",
        });
      }

      return recipe;
    }),

  // Craft a recipe
  craftRecipe: protectedProcedure
    .input(
      z.object({
        recipeId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Rate limiting: 1 action per 2 seconds (30 per minute)
      if (!checkRateLimit(userId, { maxActions: 30, windowMs: 60 * 1000 })) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Rate limit exceeded. Please wait before crafting again.",
        });
      }
      
      const player = await db.player.findUnique({
        where: { userId },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Get recipe with inputs and station definition
      const recipe = await db.recipe.findUnique({
        where: { id: input.recipeId },
        include: {
          job: true,
          outputItem: true,
          stationDefinition: true,
          inputs: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!recipe) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recipe not found",
        });
      }

      if (!recipe.isActive || recipe.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Recipe is not active",
        });
      }

      // Check if player has all required inputs
      for (const input of recipe.inputs) {
        const hasEnough = await hasItem(player.id, input.itemId, input.qty);
        if (!hasEnough) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient ${input.item.name}. Need ${input.qty}, but don't have enough.`,
          });
        }
      }

      // Get user's job level
      const userJob = await db.userJob.findUnique({
        where: {
          playerId_jobId: {
            playerId: player.id,
            jobId: recipe.jobId,
          },
        },
      });

      if (!userJob) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You don't have this job unlocked",
        });
      }

      // Check required job level
      if (userJob.level < recipe.requiredJobLevel) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This recipe requires level ${recipe.requiredJobLevel} ${recipe.job.name}. You are level ${userJob.level}.`,
        });
      }

      // Check station unlock if using stationDefinition
      if (recipe.stationDefinitionId && recipe.stationDefinition) {
        const station = recipe.stationDefinition;
        
        if (!station.isEnabled || station.status !== "ACTIVE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Station "${station.name}" is not available`,
          });
        }

        if (userJob.level < station.unlockLevel) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Station "${station.name}" requires level ${station.unlockLevel}. You are level ${userJob.level}.`,
          });
        }
      }

      // Calculate success chance (use recipe.successRate if provided, otherwise calculate)
      const successChance = calculateSuccessChance(userJob.level, recipe.difficulty, recipe.successRate);
      const success = Math.random() < successChance;

      // Calculate XP (use recipe.xp if provided, otherwise calculate from difficulty)
      const xpGained = recipe.xp > 0 ? recipe.xp : getCraftXp(success, recipe.difficulty);

      // Use transaction to ensure atomicity
      const result = await db.$transaction(async (tx) => {
        // Check inputs again (within transaction)
        for (const input of recipe.inputs) {
          const hasEnough = await hasItem(player.id, input.itemId, input.qty, tx);
          if (!hasEnough) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Insufficient ${input.item.name}. Need ${input.qty}, but don't have enough.`,
            });
          }
        }

        // Remove inputs
        for (const input of recipe.inputs) {
          const removed = await removeItemFromInventory(player.id, input.itemId, input.qty, tx);
          if (!removed) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to remove ${input.item.name}`,
            });
          }
        }

        // Add output on success
        if (success) {
          await addItemToInventory(player.id, recipe.outputItemId, recipe.outputQty, tx);
        }

        // Record attempt
        const attempt = await tx.craftAttempt.create({
          data: {
            playerId: player.id,
            recipeId: recipe.id,
            success,
            xpGained,
          },
        });

        // Update job XP (use the shared addXp function for consistent leveling)
        const levelResult = addXp(userJob.level, userJob.xp, xpGained, 100);

        await tx.userJob.update({
          where: { id: userJob.id },
          data: {
            xp: levelResult.newXp,
            level: levelResult.newLevel,
          },
        });

        return {
          attempt,
          success,
          xpGained,
          leveledUp: levelResult.leveledUp,
          level: levelResult.newLevel,
          xpInLevel: levelResult.xpInLevel,
          xpToNext: levelResult.xpToNext,
          progressPct: levelResult.progressPct,
        };
      });

      return {
        success: result.success,
        xpGained: result.xpGained,
        outputItem: success ? recipe.outputItem : null,
        outputQty: success ? recipe.outputQty : 0,
        leveledUp: result.leveledUp,
        level: result.level,
        xpInLevel: result.xpInLevel,
        xpToNext: result.xpToNext,
        progressPct: result.progressPct,
      };
    }),

  // Get crafting history
  getMyCraftHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const player = await db.player.findUnique({
        where: { userId },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      return await db.craftAttempt.findMany({
        where: { playerId: player.id },
        include: {
          recipe: {
            include: {
              job: true,
              outputItem: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });
    }),

  // Get recent successful craft attempts (for market display)
  getRecentCraftedItems: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      return await db.craftAttempt.findMany({
        where: { success: true },
        include: {
          recipe: {
            include: {
              job: true,
              outputItem: true,
            },
          },
          player: {
            select: {
              characterName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }),
});
