import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
} from "~/server/api/trpc";

export const contentQuestsRouter = createTRPCRouter({
  // List all quest templates
  list: adminProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const quests = await ctx.db.questTemplate.findMany({
        where: {
          ...(input.includeArchived ? {} : { isArchived: false }),
        },
        take: input.limit,
        orderBy: {
          createdAt: "desc",
        },
      });

      return quests;
    }),

  // Get quest template by ID
  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const quest = await ctx.db.questTemplate.findUnique({
        where: { id: input.id },
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
  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        stepsJSON: z
          .string()
          .transform((str, ctx) => {
            try {
              return JSON.parse(str);
            } catch {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid JSON for steps",
              });
              return z.NEVER;
            }
          })
          .or(z.array(z.unknown())),
        rewardsJSON: z
          .string()
          .transform((str, ctx) => {
            try {
              return JSON.parse(str);
            } catch {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid JSON for rewards",
              });
              return z.NEVER;
            }
          })
          .or(z.record(z.unknown()))
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const steps =
        typeof input.stepsJSON === "string"
          ? JSON.parse(input.stepsJSON)
          : input.stepsJSON;
      const rewards =
        input.rewardsJSON !== undefined
          ? typeof input.rewardsJSON === "string"
            ? JSON.parse(input.rewardsJSON)
            : input.rewardsJSON
          : null;

      const quest = await ctx.db.questTemplate.create({
        data: {
          title: input.title,
          description: input.description,
          stepsJSON: steps,
          rewardsJSON: rewards,
        },
      });

      return quest;
    }),

  // Update quest template
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        stepsJSON: z
          .string()
          .transform((str, ctx) => {
            try {
              return JSON.parse(str);
            } catch {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid JSON for steps",
              });
              return z.NEVER;
            }
          })
          .or(z.array(z.unknown()))
          .optional(),
        rewardsJSON: z
          .string()
          .transform((str, ctx) => {
            try {
              return JSON.parse(str);
            } catch {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid JSON for rewards",
              });
              return z.NEVER;
            }
          })
          .or(z.record(z.unknown()))
          .optional()
          .nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, stepsJSON, rewardsJSON, ...updateData } = input;

      const quest = await ctx.db.questTemplate.findUnique({
        where: { id },
      });

      if (!quest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quest template not found",
        });
      }

      const updatePayload: {
        title?: string;
        description?: string | null;
        stepsJSON?: unknown;
        rewardsJSON?: unknown | null;
      } = { ...updateData };

      if (stepsJSON !== undefined) {
        updatePayload.stepsJSON =
          typeof stepsJSON === "string"
            ? JSON.parse(stepsJSON)
            : stepsJSON;
      }

      if (rewardsJSON !== undefined) {
        updatePayload.rewardsJSON =
          rewardsJSON === null
            ? null
            : typeof rewardsJSON === "string"
              ? JSON.parse(rewardsJSON)
              : rewardsJSON;
      }

      const updatedQuest = await ctx.db.questTemplate.update({
        where: { id },
        data: updatePayload,
      });

      return updatedQuest;
    }),

  // Archive quest template
  archive: adminProcedure
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
        data: {
          isArchived: true,
          deletedAt: new Date(),
        },
      });

      return updatedQuest;
    }),

  // Unarchive quest template
  unarchive: adminProcedure
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
        data: {
          isArchived: false,
          deletedAt: null,
        },
      });

      return updatedQuest;
    }),

  // Hard delete
  delete: adminProcedure
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

      // TODO: Check for references

      await ctx.db.questTemplate.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
