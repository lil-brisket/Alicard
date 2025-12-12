import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { addItemToInventory } from "~/server/lib/inventory";
import {
  getLevelFromXp,
  getMaxXpForLevel,
} from "~/server/lib/job-utils";

// Calculate gathering success chance
// Success chance = clamp(0.3, 0.98, 0.65 + (jobLevel - dangerTier)*0.06)
function calculateGatherSuccessChance(jobLevel: number, dangerTier: number): number {
  const base = 0.65 + (jobLevel - dangerTier) * 0.06;
  return Math.max(0.3, Math.min(0.98, base));
}

// Calculate XP gained from gathering
function getGatherXp(success: boolean, dangerTier: number): number {
  if (success) {
    return 8 + dangerTier * 3;
  } else {
    return 3 + dangerTier;
  }
}

// Select items from node yields based on weight
function selectNodeYields(yields: Array<{ itemId: string; minQty: number; maxQty: number; weight: number }>): Array<{ itemId: string; qty: number }> {
  const results: Array<{ itemId: string; qty: number }> = [];
  
  for (const yield_ of yields) {
    // Simple weight-based selection (100 weight = always yields)
    if (Math.random() * 100 < yield_.weight) {
      const qty = yield_.minQty + Math.floor(Math.random() * (yield_.maxQty - yield_.minQty + 1));
      results.push({ itemId: yield_.itemId, qty });
    }
  }
  
  return results;
}

export const gatheringRouter = createTRPCRouter({
  // List all gathering nodes (optional filter by job)
  listNodes: publicProcedure
    .input(
      z.object({
        jobId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const where = input?.jobId ? { jobId: input.jobId } : {};
      
      return await db.gatheringNode.findMany({
        where,
        include: {
          job: true,
          yields: {
            include: {
              item: true,
            },
          },
        },
        orderBy: { dangerTier: "asc" },
      });
    }),

  // Gather from a node
  gatherFromNode: protectedProcedure
    .input(
      z.object({
        nodeId: z.string(),
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

      // Get node with yields
      const node = await db.gatheringNode.findUnique({
        where: { id: input.nodeId },
        include: {
          job: true,
          yields: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!node) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gathering node not found",
        });
      }

      if (node.yields.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This node has no yields configured",
        });
      }

      // Get user's job level
      const userJob = await db.userJob.findUnique({
        where: {
          playerId_jobId: {
            playerId: player.id,
            jobId: node.jobId,
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
      const successChance = calculateGatherSuccessChance(userJob.level, node.dangerTier);
      const success = Math.random() < successChance;

      // Calculate XP
      const xpGained = getGatherXp(success, node.dangerTier);

      // Select yields on success
      const gatheredItems = success
        ? selectNodeYields(node.yields.map((y) => ({
            itemId: y.itemId,
            minQty: y.minQty,
            maxQty: y.maxQty,
            weight: y.weight,
          })))
        : [];

      // Use transaction
      const result = await db.$transaction(async (tx) => {
        // Add items on success
        if (success) {
          for (const item of gatheredItems) {
            await addItemToInventory(player.id, item.itemId, item.qty, tx);
          }
        }

        // Record attempt
        const attempt = await tx.gatherAttempt.create({
          data: {
            playerId: player.id,
            nodeId: node.id,
            success,
            xpGained,
          },
        });

        // Update job XP
        const oldXp = userJob.xp;
        const newXp = oldXp + xpGained;
        const maxXp = getMaxXpForLevel(10);
        const cappedXp = Math.min(newXp, maxXp);
        const newLevel = getLevelFromXp(cappedXp);
        const oldLevel = getLevelFromXp(oldXp);

        await tx.userJob.update({
          where: { id: userJob.id },
          data: {
            xp: cappedXp,
            level: getLevelFromXp(cappedXp),
          },
        });

        return {
          attempt,
          success,
          xpGained,
          leveledUp: newLevel > oldLevel,
          items: gatheredItems.map((item) => ({
            itemId: item.itemId,
            qty: item.qty,
          })),
        };
      });

      // Get item details for response
      const itemsWithDetails = success
        ? await Promise.all(
            result.items.map(async (item) => {
              const itemData = await db.item.findUnique({
                where: { id: item.itemId },
              });
              return {
                ...item,
                item: itemData,
              };
            })
          )
        : [];

      return {
        success: result.success,
        xpGained: result.xpGained,
        items: itemsWithDetails,
        leveledUp: result.leveledUp,
      };
    }),

  // Get gathering history
  getMyGatherHistory: protectedProcedure
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

      return await db.gatherAttempt.findMany({
        where: { playerId: player.id },
        include: {
          node: {
            include: {
              job: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });
    }),
});
