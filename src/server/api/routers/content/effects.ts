import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";
import { requireContentPermission } from "~/server/lib/admin-auth";

const contentStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED", "PUBLISHED", "ARCHIVED"]);

const effectTypeSchema = z.enum([
  "HEAL_INSTANT",
  "HEAL_REGEN",
  "STAMINA_RESTORE",
  "BUFF_STAT",
  "RESISTANCE",
  "DAMAGE_OVER_TIME",
  "UTILITY",
]);

const stackingRuleSchema = z.enum(["NONE", "REFRESH", "STACK", "REPLACE_WEAKER"]);

export const contentEffectsRouter = createTRPCRouter({
  // List effects with filtering
  list: contentProcedure
    .input(
      z.object({
        type: effectTypeSchema.optional(),
        query: z.string().optional(),
        status: contentStatusSchema.optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.type) {
        where.type = input.type;
      }

      if (input?.status) {
        where.status = input.status;
      }

      if (input?.query) {
        where.OR = [
          { name: { contains: input.query, mode: "insensitive" } },
          { key: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
        ];
      }

      return await ctx.db.effectDefinition.findMany({
        where,
        include: {
          _count: {
            select: { itemEffects: true },
          },
        },
        orderBy: [
          { type: "asc" },
          { name: "asc" },
        ],
        take: input?.limit ?? 50,
      });
    }),

  // Get effect by ID
  get: contentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const effect = await ctx.db.effectDefinition.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { itemEffects: true },
          },
        },
      });

      if (!effect) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Effect not found",
        });
      }

      return effect;
    }),

  // Get effect by key
  getByKey: contentProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const effect = await ctx.db.effectDefinition.findUnique({
        where: { key: input.key },
        include: {
          _count: {
            select: { itemEffects: true },
          },
        },
      });

      if (!effect) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Effect not found",
        });
      }

      return effect;
    }),

  // Create new effect (requires content.create permission)
  create: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.create");
      return next({ ctx });
    })
    .input(
      z.object({
        key: z.string().min(1, "Key is required").regex(/^[a-z0-9_-]+$/, "Key must be lowercase alphanumeric with dashes/underscores"),
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        type: effectTypeSchema,
        magnitude: z.number().default(0),
        durationSeconds: z.number().int().min(0).nullable().optional(),
        tickSeconds: z.number().int().min(1).nullable().optional(),
        stackingRule: stackingRuleSchema.default("NONE"),
        pvpScalar: z.number().min(0).max(1).nullable().optional(),
        cooldownSeconds: z.number().int().min(0).nullable().optional(),
        metadata: z.record(z.any()).optional(),
        status: contentStatusSchema.default("DRAFT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if key already exists
      const existing = await ctx.db.effectDefinition.findUnique({
        where: { key: input.key },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Effect with key "${input.key}" already exists`,
        });
      }

      // Validate: duration-based effects should have durationSeconds
      if ((input.type === "HEAL_REGEN" || input.type === "DAMAGE_OVER_TIME" || input.type === "BUFF_STAT") && !input.durationSeconds) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${input.type} effects must have durationSeconds set`,
        });
      }

      // Validate: DOT/HOT effects should have tickSeconds
      if ((input.type === "HEAL_REGEN" || input.type === "DAMAGE_OVER_TIME") && !input.tickSeconds) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${input.type} effects must have tickSeconds set`,
        });
      }

      const effect = await ctx.db.effectDefinition.create({
        data: {
          key: input.key,
          name: input.name,
          description: input.description,
          tags: input.tags ?? [],
          type: input.type,
          magnitude: input.magnitude,
          durationSeconds: input.durationSeconds ?? null,
          tickSeconds: input.tickSeconds ?? null,
          stackingRule: input.stackingRule,
          pvpScalar: input.pvpScalar ?? null,
          cooldownSeconds: input.cooldownSeconds ?? null,
          metadata: input.metadata ?? {},
          status: input.status,
          createdBy: ctx.session.user.id,
        },
      });

      return effect;
    }),

  // Update effect (requires content.edit permission)
  update: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        id: z.string(),
        key: z.string().regex(/^[a-z0-9_-]+$/).optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        type: effectTypeSchema.optional(),
        magnitude: z.number().optional(),
        durationSeconds: z.number().int().min(0).nullable().optional(),
        tickSeconds: z.number().int().min(1).nullable().optional(),
        stackingRule: stackingRuleSchema.optional(),
        pvpScalar: z.number().min(0).max(1).nullable().optional(),
        cooldownSeconds: z.number().int().min(0).nullable().optional(),
        metadata: z.record(z.any()).optional(),
        status: contentStatusSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const existing = await ctx.db.effectDefinition.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Effect not found",
        });
      }

      // Check key uniqueness if key is being updated
      if (input.key && input.key !== existing.key) {
        const keyExists = await ctx.db.effectDefinition.findUnique({
          where: { key: input.key },
        });

        if (keyExists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Effect with key "${input.key}" already exists`,
          });
        }
      }

      // Validate duration requirements if type is being updated
      const finalType = input.type ?? existing.type;
      if ((finalType === "HEAL_REGEN" || finalType === "DAMAGE_OVER_TIME" || finalType === "BUFF_STAT") && !(input.durationSeconds !== undefined ? input.durationSeconds : existing.durationSeconds)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${finalType} effects must have durationSeconds set`,
        });
      }

      const updated = await ctx.db.effectDefinition.update({
        where: { id },
        data: updateData,
      });

      return updated;
    }),

  // Delete effect (requires content.delete permission - ADMIN only)
  delete: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.delete");
      return next({ ctx });
    })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const effect = await ctx.db.effectDefinition.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { itemEffects: true },
          },
        },
      });

      if (!effect) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Effect not found",
        });
      }

      if (effect._count.itemEffects > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete effect: ${effect._count.itemEffects} item(s) are using it`,
        });
      }

      // Soft delete: set status to ARCHIVED
      await ctx.db.effectDefinition.update({
        where: { id: input.id },
        data: {
          status: "ARCHIVED",
        },
      });

      return { success: true };
    }),
});
