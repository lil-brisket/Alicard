import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "~/server/types/prisma";
import {
  createTRPCRouter,
  adminProcedure,
} from "~/server/api/trpc";

const statsJSONSchema = z.object({
  vitality: z.number(),
  strength: z.number(),
  speed: z.number(),
  dexterity: z.number(),
});

export const contentMonstersRouter = createTRPCRouter({
  // List all monster templates
  list: adminProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const monsters = await ctx.db.monsterTemplate.findMany({
        where: {
          ...(input.includeArchived ? {} : { isArchived: false }),
        },
        take: input.limit,
        orderBy: {
          createdAt: "desc",
        },
      });

      return monsters;
    }),

  // Get monster template by ID
  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const monster = await ctx.db.monsterTemplate.findUnique({
        where: { id: input.id },
      });

      if (!monster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Monster template not found",
        });
      }

      return monster;
    }),

  // Create new monster template
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        level: z.number().min(1).default(1),
        hp: z.number().min(1),
        sp: z.number().min(0).default(0),
        statsJSON: z
          .string()
          .transform((str, ctx) => {
            try {
              const parsed = JSON.parse(str);
              return statsJSONSchema.parse(parsed);
            } catch {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid JSON for stats",
              });
              return z.NEVER;
            }
          })
          .or(statsJSONSchema),
        lootTableId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const stats =
        typeof input.statsJSON === "string"
          ? JSON.parse(input.statsJSON)
          : input.statsJSON;

      const monster = await ctx.db.monsterTemplate.create({
        data: {
          name: input.name,
          level: input.level,
          hp: input.hp,
          sp: input.sp,
          statsJSON: stats,
          lootTableId: input.lootTableId,
        },
      });

      return monster;
    }),

  // Update monster template
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        level: z.number().min(1).optional(),
        hp: z.number().min(1).optional(),
        sp: z.number().min(0).optional(),
        statsJSON: z
          .string()
          .transform((str, ctx) => {
            try {
              const parsed = JSON.parse(str);
              return statsJSONSchema.parse(parsed);
            } catch {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid JSON for stats",
              });
              return z.NEVER;
            }
          })
          .or(statsJSONSchema)
          .optional(),
        lootTableId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, statsJSON, ...updateData } = input;

      const monster = await ctx.db.monsterTemplate.findUnique({
        where: { id },
      });

      if (!monster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Monster template not found",
        });
      }

      const updatePayload: {
        name?: string;
        level?: number;
        hp?: number;
        sp?: number;
        statsJSON?: unknown;
        lootTableId?: string | null;
      } = { ...updateData };

      if (statsJSON !== undefined) {
        updatePayload.statsJSON =
          typeof statsJSON === "string"
            ? JSON.parse(statsJSON)
            : statsJSON;
      }

      const updatedMonster = await ctx.db.monsterTemplate.update({
        where: { id },
        data: {
          ...updateData,
          ...(statsJSON !== undefined && {
            statsJSON: (typeof statsJSON === "string" ? JSON.parse(statsJSON) : statsJSON) as Prisma.InputJsonValue,
          }),
        },
      });

      return updatedMonster;
    }),

  // Archive monster template
  archive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const monster = await ctx.db.monsterTemplate.findUnique({
        where: { id: input.id },
      });

      if (!monster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Monster template not found",
        });
      }

      const updatedMonster = await ctx.db.monsterTemplate.update({
        where: { id: input.id },
        data: {
          isArchived: true,
          deletedAt: new Date(),
        },
      });

      return updatedMonster;
    }),

  // Unarchive monster template
  unarchive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const monster = await ctx.db.monsterTemplate.findUnique({
        where: { id: input.id },
      });

      if (!monster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Monster template not found",
        });
      }

      const updatedMonster = await ctx.db.monsterTemplate.update({
        where: { id: input.id },
        data: {
          isArchived: false,
          deletedAt: null,
        },
      });

      return updatedMonster;
    }),

  // Hard delete
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const monster = await ctx.db.monsterTemplate.findUnique({
        where: { id: input.id },
      });

      if (!monster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Monster template not found",
        });
      }

      // TODO: Check for references in Battle, etc.

      await ctx.db.monsterTemplate.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
