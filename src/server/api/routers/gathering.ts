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
  addXp,
} from "~/server/lib/job-utils";
import { checkRateLimit } from "~/server/lib/rate-limit";

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
  // Only returns active nodes with yields including item.name and item.type
  listNodes: publicProcedure
    .input(
      z.object({
        jobKey: z.string().optional(),
        jobId: z.string().optional(),
        dangerTierMax: z.number().int().min(1).max(10).optional(),
        search: z.string().optional(),
        playerLevel: z.number().int().min(1).optional(), // Filter by player's job level
      }).optional()
    )
    .query(async ({ input }) => {
      const where: {
        jobId?: string;
        dangerTier?: { lte: number };
        name?: { contains: string; mode?: "insensitive" };
        isActive?: boolean;
        requiredJobLevel?: { lte: number };
      } = {
        isActive: true, // Only return active nodes (runtime filter)
        // Note: We don't filter by status here because status is for content management
        // Runtime should only care about isActive flag
      };
      
      // Filter by player level if provided
      if (input?.playerLevel !== undefined) {
        where.requiredJobLevel = { lte: input.playerLevel };
      }
      
      if (input?.jobKey) {
        const job = await db.job.findUnique({ where: { key: input.jobKey } });
        if (job) {
          where.jobId = job.id;
        }
      } else if (input?.jobId) {
        where.jobId = input.jobId;
      }
      
      if (input?.dangerTierMax !== undefined) {
        where.dangerTier = { lte: input.dangerTierMax };
      }
      
      if (input?.search) {
        where.name = { contains: input.search, mode: "insensitive" };
      }
      
      return await db.gatheringNode.findMany({
        where,
        include: {
          job: true,
          yields: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  itemType: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: [
          { tier: "asc" },
          { requiredJobLevel: "asc" },
          { dangerTier: "asc" },
        ],
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
      
      // Rate limiting: 1 action per 2 seconds (30 per minute)
      if (!checkRateLimit(userId, { maxActions: 30, windowMs: 60 * 1000 })) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Rate limit exceeded. Please wait before gathering again.",
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

      // Validate required job level
      if (userJob.level < node.requiredJobLevel) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `This node requires job level ${node.requiredJobLevel}. Your current level is ${userJob.level}.`,
        });
      }

      // Calculate success chance
      const successChance = calculateGatherSuccessChance(userJob.level, node.dangerTier);
      const success = Math.random() < successChance;

      // Use XP from node (nodes should always have xpReward set)
      const xpGained = node.xpReward;

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
        level: result.level,
        xpInLevel: result.xpInLevel,
        xpToNext: result.xpToNext,
        progressPct: result.progressPct,
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

  // Get all gatherable items for a specific job
  getGatherableItemsByJob: publicProcedure
    .input(
      z.object({
        jobKey: z.string(),
        playerLevel: z.number().int().min(1).optional(),
      })
    )
    .query(async ({ input }) => {
      // Find the job by key
      const job = await db.job.findUnique({
        where: { key: input.jobKey },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Job with key "${input.jobKey}" not found`,
        });
      }

      // Build where clause for nodes
      const nodeWhere: {
        jobId: string;
        isActive: boolean;
        requiredJobLevel?: { lte: number };
      } = {
        jobId: job.id,
        isActive: true,
      };

      // Filter by player level if provided
      if (input.playerLevel !== undefined) {
        nodeWhere.requiredJobLevel = { lte: input.playerLevel };
      }

      // Get all nodes for this job with their yields
      const nodes = await db.gatheringNode.findMany({
        where: nodeWhere,
        include: {
          yields: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  itemType: true,
                  description: true,
                  itemRarity: true,
                  tier: true,
                  value: true,
                },
              },
            },
          },
        },
        orderBy: [
          { tier: "asc" },
          { requiredJobLevel: "asc" },
        ],
      });

      // Aggregate items from all yields
      // Items can appear in multiple nodes, so we'll combine them
      const itemMap = new Map<
        string,
        {
          item: {
            id: string;
            name: string;
            itemType: string;
            description: string | null;
            itemRarity: string;
            tier: number;
            value: number;
          };
          nodes: Array<{
            nodeId: string;
            nodeName: string;
            nodeTier: number;
            requiredJobLevel: number;
            dangerTier: number;
            minQty: number;
            maxQty: number;
            weight: number;
          }>;
          minQty: number; // Overall minimum across all nodes
          maxQty: number; // Overall maximum across all nodes
        }
      >();

      for (const node of nodes) {
        for (const yield_ of node.yields) {
          const itemId = yield_.itemId;
          const existing = itemMap.get(itemId);

          const nodeInfo = {
            nodeId: node.id,
            nodeName: node.name,
            nodeTier: node.tier,
            requiredJobLevel: node.requiredJobLevel,
            dangerTier: node.dangerTier,
            minQty: yield_.minQty,
            maxQty: yield_.maxQty,
            weight: yield_.weight,
          };

          if (existing) {
            // Item already exists, add this node to the list
            existing.nodes.push(nodeInfo);
            existing.minQty = Math.min(existing.minQty, yield_.minQty);
            existing.maxQty = Math.max(existing.maxQty, yield_.maxQty);
          } else {
            // First occurrence of this item
            itemMap.set(itemId, {
              item: yield_.item,
              nodes: [nodeInfo],
              minQty: yield_.minQty,
              maxQty: yield_.maxQty,
            });
          }
        }
      }

      // Convert map to array and sort
      return Array.from(itemMap.values()).sort((a, b) => {
        // Sort by tier first, then by name
        if (a.item.tier !== b.item.tier) {
          return a.item.tier - b.item.tier;
        }
        return a.item.name.localeCompare(b.item.name);
      });
    }),
});
