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
} from "~/server/lib/job-utils";

// Calculate crafting success chance
// Success chance = clamp(0.2, 0.95, 0.55 + (jobLevel - difficulty)*0.07)
function calculateSuccessChance(jobLevel: number, difficulty: number): number {
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
        jobId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const where = input?.jobId ? { jobId: input.jobId } : {};
      
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
      
      const player = await db.player.findUnique({
        where: { userId },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Get recipe with inputs
      const recipe = await db.recipe.findUnique({
        where: { id: input.recipeId },
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

      // Calculate success chance
      const successChance = calculateSuccessChance(userJob.level, recipe.difficulty);
      const success = Math.random() < successChance;

      // Calculate XP
      const xpGained = getCraftXp(success, recipe.difficulty);

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

        // Update job XP (use the jobs router logic for leveling)
        const oldXp = userJob.xp;
        const oldLevel = getLevelFromXp(oldXp);
        const newXp = oldXp + xpGained;
        const maxXp = getMaxXpForLevel(10);
        const cappedXp = Math.min(newXp, maxXp);
        const newLevel = getLevelFromXp(cappedXp);

        await tx.userJob.update({
          where: { id: userJob.id },
          data: {
            xp: cappedXp,
            level: newLevel,
          },
        });

        return {
          attempt,
          success,
          xpGained,
          leveledUp: newLevel > oldLevel,
        };
      });

      return {
        success: result.success,
        xpGained: result.xpGained,
        outputItem: success ? recipe.outputItem : null,
        outputQty: success ? recipe.outputQty : 0,
        leveledUp: result.leveledUp,
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
