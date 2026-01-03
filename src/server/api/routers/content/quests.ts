import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";
import { slugify, isValidSlug } from "~/lib/utils/slug";
import { logAuditEvent, getIpAddress, getUserAgent } from "~/server/lib/audit";

const contentStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED", "PUBLISHED", "ARCHIVED"]);
const questRepeatabilitySchema = z.enum(["ONCE", "DAILY", "WEEKLY", "REPEATABLE"]);
const questStepTypeSchema = z.enum([
  "KILL_ENEMY",
  "GATHER_ITEM",
  "CRAFT_ITEM",
  "VISIT_LOCATION",
  "DELIVER_ITEM",
  "TALK_TO_NPC",
  "INTERACT_NODE",
]);
const questRewardTypeSchema = z.enum([
  "XP_CHARACTER",
  "XP_OCCUPATION",
  "ITEM",
  "GOLD",
  "RECIPE_UNLOCK",
  "SKILL_UNLOCK",
]);

const questStepSchema = z.object({
  type: questStepTypeSchema,
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  targetRefType: z.string().optional().nullable(),
  targetRefId: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  conditionsJson: z.record(z.unknown()).optional().nullable(),
  isOptional: z.boolean().default(false),
});

const questRewardSchema = z.object({
  type: questRewardTypeSchema,
  refId: z.string().optional().nullable(),
  amount: z.number().int().min(0).default(0),
  probability: z.number().min(0).max(1).default(1.0),
  notes: z.string().optional().nullable(),
});

// Validation helper for step types that require targetRefId
function stepRequiresTarget(stepType: string): boolean {
  return [
    "KILL_ENEMY",
    "GATHER_ITEM",
    "DELIVER_ITEM",
    "CRAFT_ITEM",
    "VISIT_LOCATION",
    "TALK_TO_NPC",
    "INTERACT_NODE",
  ].includes(stepType);
}

// Validation helper for publishing gate
async function validateQuestForPublishing(
  db: any,
  questId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  const quest = await db.questTemplate.findUnique({
    where: { id: questId },
    include: {
      steps: {
        orderBy: { ordering: "asc" },
      },
      rewards: true,
    },
  });

  if (!quest) {
    return { valid: false, errors: ["Quest not found"] };
  }

  // Must have at least one step
  if (quest.steps.length === 0) {
    errors.push("Quest must have at least one step");
  }

  // Every step must be valid
  for (const [index, step] of quest.steps.entries()) {
    if (stepRequiresTarget(step.type) && !step.targetRefId) {
      errors.push(`Step ${index + 1} (${step.type}) requires a target reference`);
    }
    // TODO: Validate that targetRefId references a valid entity
    // This would require checking against EnemyTemplate, Item, MapTile, etc.
  }

  // Must have at least one reward
  if (quest.rewards.length === 0) {
    errors.push("Quest must have at least one reward");
  }

  // Validate ordering is contiguous (1, 2, 3, ...)
  const orderings = quest.steps.map((s: { ordering: number }) => s.ordering).sort((a: number, b: number) => a - b);
  for (let i = 0; i < orderings.length; i++) {
    if (orderings[i] !== i + 1) {
      errors.push(`Step ordering must be contiguous (found gap at step ${i + 1})`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const contentQuestsRouter = createTRPCRouter({
  // List quest templates with filtering
  list: contentProcedure
    .input(
      z.object({
        status: contentStatusSchema.optional(),
        repeatability: questRepeatabilitySchema.optional(),
        occupationType: z.string().optional(),
        minLevel: z.number().int().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["name", "status", "repeatability", "recommendedMinLevel", "updatedAt"]).default("updatedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input.status) {
        where.status = input.status;
      }

      if (input.repeatability) {
        where.repeatability = input.repeatability;
      }

      if (input.occupationType) {
        where.occupationType = input.occupationType;
      }

      if (input.minLevel !== undefined) {
        where.recommendedMinLevel = { gte: input.minLevel };
      }

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { slug: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const orderBy: Record<string, string> = {};
      orderBy[input.sortBy] = input.sortOrder;

      const quests = await ctx.db.questTemplate.findMany({
        where,
        take: input.limit,
        orderBy,
        include: {
          steps: {
            orderBy: { ordering: "asc" },
          },
          rewards: true,
          _count: {
            select: {
              steps: true,
              rewards: true,
            },
          },
        },
      });

      return quests;
    }),

  // Get quest template by ID
  get: contentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const quest = await ctx.db.questTemplate.findUnique({
        where: { id: input.id },
        include: {
          steps: {
            orderBy: { ordering: "asc" },
          },
          rewards: true,
          prerequisiteQuest: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!quest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quest template not found",
        });
      }

      return quest;
    }),

  // Create new quest template
  create: contentProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        slug: z.string().optional(), // Auto-generated if not provided
        description: z.string().optional().nullable(),
        status: contentStatusSchema.default("DRAFT"),
        repeatability: questRepeatabilitySchema.default("ONCE"),
        recommendedMinLevel: z.number().int().optional().nullable(),
        occupationType: z.string().optional().nullable(),
        prerequisiteQuestId: z.string().optional().nullable(),
        startTriggerType: z.string().optional().nullable(),
        startTriggerRefId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate slug if not provided
      const slug = input.slug ?? slugify(input.name);

      if (!isValidSlug(slug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid slug format. Slugs must be lower-kebab-case.",
        });
      }

      // Check slug uniqueness
      const existing = await ctx.db.questTemplate.findUnique({
        where: { slug },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A quest with this slug already exists",
        });
      }

      const quest = await ctx.db.questTemplate.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          status: input.status,
          repeatability: input.repeatability,
          recommendedMinLevel: input.recommendedMinLevel,
          occupationType: input.occupationType,
          prerequisiteQuestId: input.prerequisiteQuestId,
          startTriggerType: input.startTriggerType,
          startTriggerRefId: input.startTriggerRefId,
        },
      });

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetEntityType: "QuestTemplate",
        targetEntityId: quest.id,
        action: "QUEST_CREATED",
        payloadJson: {
          name: quest.name,
          slug: quest.slug,
          status: quest.status,
        },
        ipAddress: getIpAddress(ctx.headers),
        userAgent: getUserAgent(ctx.headers),
      });

      return quest;
    }),

  // Update quest template
  update: contentProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        slug: z.string().optional(),
        description: z.string().optional().nullable(),
        status: contentStatusSchema.optional(),
        repeatability: questRepeatabilitySchema.optional(),
        recommendedMinLevel: z.number().int().optional().nullable(),
        occupationType: z.string().optional().nullable(),
        prerequisiteQuestId: z.string().optional().nullable(),
        startTriggerType: z.string().optional().nullable(),
        startTriggerRefId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const existingQuest = await ctx.db.questTemplate.findUnique({
        where: { id },
      });

      if (!existingQuest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quest template not found",
        });
      }

      // Handle slug uniqueness if slug is being updated
      if (updateData.slug !== undefined && updateData.slug !== existingQuest.slug) {
        if (!isValidSlug(updateData.slug)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid slug format. Slugs must be lower-kebab-case.",
          });
        }

        const slugConflict = await ctx.db.questTemplate.findUnique({
          where: { slug: updateData.slug },
        });

        if (slugConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A quest with this slug already exists",
          });
        }
      }

      // Validate publishing gate if status is being set to PUBLISHED
      if (updateData.status === "PUBLISHED") {
        const validation = await validateQuestForPublishing(ctx.db, id);
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot publish quest: ${validation.errors.join("; ")}`,
          });
        }
      }

      const updatedQuest = await ctx.db.questTemplate.update({
        where: { id },
        data: updateData,
      });

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetEntityType: "QuestTemplate",
        targetEntityId: updatedQuest.id,
        action: "QUEST_UPDATED",
        payloadJson: {
          changes: updateData,
        },
        ipAddress: getIpAddress(ctx.headers),
        userAgent: getUserAgent(ctx.headers),
      });

      return updatedQuest;
    }),

  // Clone quest template
  clone: contentProcedure
    .input(z.object({ id: z.string(), newName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const sourceQuest = await ctx.db.questTemplate.findUnique({
        where: { id: input.id },
        include: {
          steps: {
            orderBy: { ordering: "asc" },
          },
          rewards: true,
        },
      });

      if (!sourceQuest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quest template not found",
        });
      }

      const newSlug = slugify(input.newName);
      if (!isValidSlug(newSlug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid name for slug generation",
        });
      }

      // Check slug uniqueness
      const existing = await ctx.db.questTemplate.findUnique({
        where: { slug: newSlug },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A quest with this slug already exists",
        });
      }

      // Create cloned quest with steps and rewards
      const clonedQuest = await ctx.db.questTemplate.create({
        data: {
          name: input.newName,
          slug: newSlug,
          description: sourceQuest.description,
          status: "DRAFT", // Always start cloned quests as DRAFT
          repeatability: sourceQuest.repeatability,
          recommendedMinLevel: sourceQuest.recommendedMinLevel,
          occupationType: sourceQuest.occupationType,
          prerequisiteQuestId: sourceQuest.prerequisiteQuestId,
          startTriggerType: sourceQuest.startTriggerType,
          startTriggerRefId: sourceQuest.startTriggerRefId,
          steps: {
            create: sourceQuest.steps.map((step) => ({
              ordering: step.ordering,
              type: step.type,
              title: step.title,
              description: step.description,
              targetRefType: step.targetRefType,
              targetRefId: step.targetRefId,
              quantity: step.quantity,
              conditionsJson: step.conditionsJson,
              isOptional: step.isOptional,
            })),
          },
          rewards: {
            create: sourceQuest.rewards.map((reward) => ({
              type: reward.type,
              refId: reward.refId,
              amount: reward.amount,
              probability: reward.probability,
              notes: reward.notes,
            })),
          },
        },
        include: {
          steps: true,
          rewards: true,
        },
      });

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetEntityType: "QuestTemplate",
        targetEntityId: clonedQuest.id,
        action: "QUEST_CLONED",
        payloadJson: {
          sourceQuestId: sourceQuest.id,
          sourceQuestName: sourceQuest.name,
          newName: clonedQuest.name,
        },
        ipAddress: getIpAddress(ctx.headers),
        userAgent: getUserAgent(ctx.headers),
      });

      return clonedQuest;
    }),

  // Archive quest template (set status to ARCHIVED)
  archive: contentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const quest = await ctx.db.questTemplate.findUnique({
        where: { id: input.id },
      });

      if (!quest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quest template not found",
        });
      }

      const updatedQuest = await ctx.db.questTemplate.update({
        where: { id: input.id },
        data: { status: "ARCHIVED" },
      });

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetEntityType: "QuestTemplate",
        targetEntityId: updatedQuest.id,
        action: "QUEST_ARCHIVED",
        payloadJson: {
          previousStatus: quest.status,
        },
        ipAddress: getIpAddress(ctx.headers),
        userAgent: getUserAgent(ctx.headers),
      });

      return updatedQuest;
    }),

  // Step management procedures
  steps: createTRPCRouter({
    // Add step to quest
    addStep: contentProcedure
      .input(
        z.object({
          questId: z.string(),
          step: questStepSchema,
          ordering: z.number().int().min(1).optional(), // If not provided, append to end
        })
      )
      .mutation(async ({ ctx, input }) => {
        const quest = await ctx.db.questTemplate.findUnique({
          where: { id: input.questId },
          include: {
            steps: {
              orderBy: { ordering: "desc" },
              take: 1,
            },
          },
        });

        if (!quest) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Quest template not found",
          });
        }

        // Validate step requirements
        if (stepRequiresTarget(input.step.type) && !input.step.targetRefId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Step type ${input.step.type} requires a targetRefId`,
          });
        }

        // Determine ordering (append to end if not specified)
        const ordering = input.ordering ?? (quest.steps[0]?.ordering ?? 0) + 1;

        const step = await ctx.db.questStep.create({
          data: {
            questId: input.questId,
            ordering,
            type: input.step.type,
            title: input.step.title,
            description: input.step.description,
            targetRefType: input.step.targetRefType,
            targetRefId: input.step.targetRefId,
            quantity: input.step.quantity,
            conditionsJson: input.step.conditionsJson,
            isOptional: input.step.isOptional,
          },
        });

        // Log audit event
        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "QuestTemplate",
          targetEntityId: input.questId,
          action: "QUEST_STEP_ADDED",
          payloadJson: {
            stepId: step.id,
            stepType: step.type,
            ordering: step.ordering,
          },
          ipAddress: getIpAddress(ctx.headers),
          userAgent: getUserAgent(ctx.headers),
        });

        return step;
      }),

    // Update step
    updateStep: contentProcedure
      .input(
        z.object({
          stepId: z.string(),
          step: questStepSchema.partial(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existingStep = await ctx.db.questStep.findUnique({
          where: { id: input.stepId },
          include: { quest: true },
        });

        if (!existingStep) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Quest step not found",
          });
        }

        // Validate step requirements if type is being updated
        const stepType = input.step.type ?? existingStep.type;
        if (stepRequiresTarget(stepType) && !(input.step.targetRefId ?? existingStep.targetRefId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Step type ${stepType} requires a targetRefId`,
          });
        }

        const updatedStep = await ctx.db.questStep.update({
          where: { id: input.stepId },
          data: input.step,
        });

        // Log audit event
        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "QuestTemplate",
          targetEntityId: existingStep.questId,
          action: "QUEST_STEP_UPDATED",
          payloadJson: {
            stepId: updatedStep.id,
            changes: input.step,
          },
          ipAddress: getIpAddress(ctx.headers),
          userAgent: getUserAgent(ctx.headers),
        });

        return updatedStep;
      }),

    // Delete step
    deleteStep: contentProcedure
      .input(z.object({ stepId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const step = await ctx.db.questStep.findUnique({
          where: { id: input.stepId },
          include: { quest: true },
        });

        if (!step) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Quest step not found",
          });
        }

        await ctx.db.questStep.delete({
          where: { id: input.stepId },
        });

        // Log audit event
        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "QuestTemplate",
          targetEntityId: step.questId,
          action: "QUEST_STEP_DELETED",
          payloadJson: {
            stepId: input.stepId,
            stepType: step.type,
            ordering: step.ordering,
          },
          ipAddress: getIpAddress(ctx.headers),
          userAgent: getUserAgent(ctx.headers),
        });

        return { success: true };
      }),

    // Reorder steps (ensures contiguous ordering)
    reorderSteps: contentProcedure
      .input(
        z.object({
          questId: z.string(),
          orderedStepIds: z.array(z.string()).min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const quest = await ctx.db.questTemplate.findUnique({
          where: { id: input.questId },
          include: {
            steps: true,
          },
        });

        if (!quest) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Quest template not found",
          });
        }

        // Validate all step IDs belong to this quest
        const stepIds = new Set(quest.steps.map((s) => s.id));
        const invalidIds = input.orderedStepIds.filter((id) => !stepIds.has(id));
        if (invalidIds.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid step IDs: ${invalidIds.join(", ")}`,
          });
        }

        // Update ordering (1-based, contiguous)
        await ctx.db.$transaction(
          input.orderedStepIds.map((stepId, index) =>
            ctx.db.questStep.update({
              where: { id: stepId },
              data: { ordering: index + 1 },
            })
          )
        );

        // Log audit event
        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "QuestTemplate",
          targetEntityId: input.questId,
          action: "QUEST_STEPS_REORDERED",
          payloadJson: {
            stepCount: input.orderedStepIds.length,
          },
          ipAddress: getIpAddress(ctx.headers),
          userAgent: getUserAgent(ctx.headers),
        });

        return { success: true };
      }),
  }),

  // Reward management procedures
  rewards: createTRPCRouter({
    // Add reward to quest
    addReward: contentProcedure
      .input(
        z.object({
          questId: z.string(),
          reward: questRewardSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        const quest = await ctx.db.questTemplate.findUnique({
          where: { id: input.questId },
        });

        if (!quest) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Quest template not found",
          });
        }

        const reward = await ctx.db.questReward.create({
          data: {
            questId: input.questId,
            type: input.reward.type,
            refId: input.reward.refId,
            amount: input.reward.amount,
            probability: input.reward.probability,
            notes: input.reward.notes,
          },
        });

        // Log audit event
        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "QuestTemplate",
          targetEntityId: input.questId,
          action: "QUEST_REWARD_ADDED",
          payloadJson: {
            rewardId: reward.id,
            rewardType: reward.type,
            amount: reward.amount,
          },
          ipAddress: getIpAddress(ctx.headers),
          userAgent: getUserAgent(ctx.headers),
        });

        return reward;
      }),

    // Update reward
    updateReward: contentProcedure
      .input(
        z.object({
          rewardId: z.string(),
          reward: questRewardSchema.partial(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existingReward = await ctx.db.questReward.findUnique({
          where: { id: input.rewardId },
          include: { quest: true },
        });

        if (!existingReward) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Quest reward not found",
          });
        }

        const updatedReward = await ctx.db.questReward.update({
          where: { id: input.rewardId },
          data: input.reward,
        });

        // Log audit event
        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "QuestTemplate",
          targetEntityId: existingReward.questId,
          action: "QUEST_REWARD_UPDATED",
          payloadJson: {
            rewardId: updatedReward.id,
            changes: input.reward,
          },
          ipAddress: getIpAddress(ctx.headers),
          userAgent: getUserAgent(ctx.headers),
        });

        return updatedReward;
      }),

    // Delete reward
    deleteReward: contentProcedure
      .input(z.object({ rewardId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const reward = await ctx.db.questReward.findUnique({
          where: { id: input.rewardId },
          include: { quest: true },
        });

        if (!reward) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Quest reward not found",
          });
        }

        await ctx.db.questReward.delete({
          where: { id: input.rewardId },
        });

        // Log audit event
        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "QuestTemplate",
          targetEntityId: reward.questId,
          action: "QUEST_REWARD_DELETED",
          payloadJson: {
            rewardId: input.rewardId,
            rewardType: reward.type,
          },
          ipAddress: getIpAddress(ctx.headers),
          userAgent: getUserAgent(ctx.headers),
        });

        return { success: true };
      }),
  }),
});
