import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";
import { requireContentPermission } from "~/server/lib/admin-auth";
import { slugify, isValidSlug } from "~/lib/utils/slug";
import { logAuditEvent } from "~/server/lib/audit";

const contentStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED"]);
const skillTypeSchema = z.enum(["ATTACK", "BUFF", "HEAL", "UTILITY", "DEBUFF"]);
const damageTypeSchema = z.enum(["PHYSICAL", "MAGIC", "TRUE"]);
const targetingSchema = z.enum(["SINGLE", "MULTI", "AOE"]);
const statTypeSchema = z.enum(["VITALITY", "STRENGTH", "SPEED", "DEXTERITY"]);
const effectTypeSchema = z.enum([
  "DAMAGE",
  "HEAL",
  "BUFF_STAT",
  "DEBUFF_STAT",
  "DOT",
  "HOT",
  "STUN",
  "SILENCE",
  "TAUNT",
  "SHIELD",
  "CLEANSE",
  "DISPEL",
]);

const skillEffectSchema = z.object({
  type: effectTypeSchema,
  stat: statTypeSchema.optional().nullable(),
  value: z.number().int(),
  ratio: z.number().optional().nullable(),
  durationTurns: z.number().int().min(0).default(0),
  chance: z.number().min(0).max(1).default(1.0),
  tickIntervalTurns: z.number().int().min(1).default(1),
  maxStacks: z.number().int().min(1).default(1),
  note: z.string().optional().nullable(),
  ordering: z.number().int().min(0).default(0),
});

// Business rule validation helper
function validateSkillRules(data: {
  skillType: string;
  basePower: number | null | undefined;
  scalingStat: string | null | undefined;
  scalingRatio: number | undefined;
  targeting: string;
  maxTargets: number | null | undefined;
  effects?: Array<{ type: string; stat: string | null | undefined }>;
}) {
  const errors: string[] = [];

  // ATTACK skills must have basePower > 0 and scalingStat
  if (data.skillType === "ATTACK") {
    if (!data.basePower || data.basePower <= 0) {
      errors.push("ATTACK skills require basePower > 0");
    }
    if (!data.scalingStat) {
      errors.push("ATTACK skills require a scalingStat");
    }
    if (data.scalingRatio !== undefined && (data.scalingRatio < 0 || data.scalingRatio > 3)) {
      errors.push("scalingRatio must be between 0 and 3");
    }
  }

  // Multi-target skills require maxTargets
  if (data.targeting !== "SINGLE" && (!data.maxTargets || data.maxTargets < 2)) {
    errors.push(`${data.targeting} targeting requires maxTargets >= 2`);
  }

  // Effects validation
  if (data.effects) {
    data.effects.forEach((effect, idx) => {
      if ((effect.type === "BUFF_STAT" || effect.type === "DEBUFF_STAT") && !effect.stat) {
        errors.push(`Effect ${idx + 1}: ${effect.type} requires a stat`);
      }
    });
  }

  return errors;
}

export const contentSkillsRouter = createTRPCRouter({
  // List all skill templates with filtering and sorting
  list: contentProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
        status: contentStatusSchema.optional(),
        skillType: skillTypeSchema.optional(),
        damageType: damageTypeSchema.optional(),
        tags: z.array(z.string()).optional(),
        search: z.string().optional(),
        sortBy: z.enum(["updatedAt", "basePower", "staminaCost", "cooldownTurns"]).default("updatedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      
      if (!input.includeArchived) {
        where.isArchived = false;
      }
      
      if (input.status) {
        where.status = input.status;
      }

      if (input.skillType) {
        where.skillType = input.skillType;
      }

      if (input.damageType) {
        where.damageType = input.damageType;
      }
      
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { key: { contains: input.search, mode: "insensitive" } },
          { slug: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const orderBy: any = {};
      orderBy[input.sortBy] = input.sortOrder;

      let skills = await ctx.db.skill.findMany({
        where,
        take: input.limit * 2, // Fetch more to account for tag filtering
        orderBy,
        include: {
          effects: {
            orderBy: { ordering: "asc" },
          },
        },
      });

      // Filter by tags in memory (Prisma JSON filtering is limited)
      if (input.tags && input.tags.length > 0) {
        skills = skills.filter((skill) => {
          const skillTags = (skill.tags as string[] | null) ?? [];
          return input.tags!.some((tag) => skillTags.includes(tag));
        });
      }

      // Limit after filtering
      return skills.slice(0, input.limit);
    }),

  // Get skill template by ID with effects
  get: contentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const skill = await ctx.db.skill.findUnique({
        where: { id: input.id },
        include: {
          effects: {
            orderBy: { ordering: "asc" },
          },
        },
      });

      if (!skill) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill template not found",
        });
      }

      return skill;
    }),

  // Create new skill template
  create: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.create");
      return next({ ctx });
    })
    .input(
      z.object({
        key: z.string().min(1, "Key is required"),
        name: z.string().min(1, "Name is required"),
        slug: z.string().optional(), // Auto-generated if not provided
        description: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        status: contentStatusSchema.default("DRAFT"),
        // Combat fields
        skillType: skillTypeSchema.default("ATTACK"),
        damageType: damageTypeSchema.optional().nullable(),
        staminaCost: z.number().int().min(0).default(0),
        cooldownTurns: z.number().int().min(0).default(0),
        castTimeTurns: z.number().int().min(0).default(0),
        hits: z.number().int().min(1).default(1),
        targeting: targetingSchema.default("SINGLE"),
        maxTargets: z.number().int().min(2).optional().nullable(),
        // Damage definition
        basePower: z.number().int().optional().nullable(),
        scalingStat: statTypeSchema.optional().nullable(),
        scalingRatio: z.number().min(0).max(3).default(1.0),
        flatBonus: z.number().int().default(0),
        levelUnlock: z.number().int().min(1).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate slug if not provided
      const slug = input.slug || slugify(input.name);
      
      if (!isValidSlug(slug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid slug format. Must be lower-kebab-case.",
        });
      }

      // Check if key or slug already exists
      const existing = await ctx.db.skill.findFirst({
        where: {
          OR: [
            { key: input.key },
            { slug },
          ],
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Skill with key "${input.key}" or slug "${slug}" already exists`,
        });
      }

      // Validate business rules
      const validationErrors = validateSkillRules({
        skillType: input.skillType,
        basePower: input.basePower,
        scalingStat: input.scalingStat,
        scalingRatio: input.scalingRatio,
        targeting: input.targeting,
        maxTargets: input.maxTargets,
      });

      if (validationErrors.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validationErrors.join("; "),
        });
      }

      try {
        const skill = await ctx.db.skill.create({
          data: {
            key: input.key,
            slug,
            name: input.name,
            description: input.description,
            tags: input.tags ?? [],
            status: input.status,
            skillType: input.skillType,
            damageType: input.damageType,
            staminaCost: input.staminaCost,
            cooldownTurns: input.cooldownTurns,
            castTimeTurns: input.castTimeTurns,
            hits: input.hits,
            targeting: input.targeting,
            maxTargets: input.maxTargets,
            basePower: input.basePower,
            scalingStat: input.scalingStat,
            scalingRatio: input.scalingRatio,
            flatBonus: input.flatBonus,
            levelUnlock: input.levelUnlock,
            version: 1,
            createdBy: ctx.session.user.id,
          },
        });

        // Log audit event
        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "Skill",
          targetEntityId: skill.id,
          action: "SKILL_CREATED",
          payloadJson: { key: skill.key, name: skill.name },
        });

        return skill;
      } catch (error: any) {
        console.error("Error creating skill template:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message || "Failed to create skill template",
          cause: error,
        });
      }
    }),

  // Update skill template
  update: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        id: z.string(),
        key: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        slug: z.string().optional(),
        description: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        status: contentStatusSchema.optional(),
        isArchived: z.boolean().optional(),
        // Combat fields
        skillType: skillTypeSchema.optional(),
        damageType: damageTypeSchema.optional().nullable(),
        staminaCost: z.number().int().min(0).optional(),
        cooldownTurns: z.number().int().min(0).optional(),
        castTimeTurns: z.number().int().min(0).optional(),
        hits: z.number().int().min(1).optional(),
        targeting: targetingSchema.optional(),
        maxTargets: z.number().int().min(2).optional().nullable(),
        // Damage definition
        basePower: z.number().int().optional().nullable(),
        scalingStat: statTypeSchema.optional().nullable(),
        scalingRatio: z.number().min(0).max(3).optional(),
        flatBonus: z.number().int().optional(),
        levelUnlock: z.number().int().min(1).optional().nullable(),
        affectsExisting: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, affectsExisting, ...updateData } = input;

      const skill = await ctx.db.skill.findUnique({
        where: { id },
        include: { effects: true },
      });

      if (!skill) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill template not found",
        });
      }

      // Validate slug if provided
      if (input.slug && !isValidSlug(input.slug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid slug format. Must be lower-kebab-case.",
        });
      }

      // Check for conflicts
      if (input.key && input.key !== skill.key) {
        const existing = await ctx.db.skill.findUnique({
          where: { key: input.key },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Skill with key "${input.key}" already exists`,
          });
        }
      }

      if (input.slug && input.slug !== skill.slug) {
        const existing = await ctx.db.skill.findUnique({
          where: { slug: input.slug },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Skill with slug "${input.slug}" already exists`,
          });
        }
      }

      // Validate business rules with current + new data
      const mergedData = {
        skillType: input.skillType ?? skill.skillType,
        basePower: input.basePower !== undefined ? input.basePower : skill.basePower,
        scalingStat: input.scalingStat !== undefined ? input.scalingStat : skill.scalingStat,
        scalingRatio: input.scalingRatio ?? skill.scalingRatio,
        targeting: input.targeting ?? skill.targeting,
        maxTargets: input.maxTargets !== undefined ? input.maxTargets : skill.maxTargets,
        effects: skill.effects.map(e => ({ type: e.type, stat: e.stat })),
      };

      const validationErrors = validateSkillRules(mergedData);
      if (validationErrors.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validationErrors.join("; "),
        });
      }

      const versionIncrement = affectsExisting ? 0 : 1;
      
      const updatedSkill = await ctx.db.skill.update({
        where: { id },
        data: {
          ...updateData,
          version: skill.version + versionIncrement,
        },
      });

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetEntityType: "Skill",
        targetEntityId: skill.id,
        action: "SKILL_UPDATED",
        payloadJson: { changes: Object.keys(updateData) },
      });

      return updatedSkill;
    }),

  // Archive/Unarchive skill
  archive: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(z.object({ id: z.string(), isArchived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const skill = await ctx.db.skill.findUnique({
        where: { id: input.id },
      });

      if (!skill) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill template not found",
        });
      }

      const updated = await ctx.db.skill.update({
        where: { id: input.id },
        data: { isArchived: input.isArchived },
      });

      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetEntityType: "Skill",
        targetEntityId: skill.id,
        action: input.isArchived ? "SKILL_ARCHIVED" : "SKILL_UNARCHIVED",
        payloadJson: {},
      });

      return updated;
    }),

  // Clone skill template with effects
  clone: contentProcedure
    .input(
      z.object({
        id: z.string(),
        key: z.string().min(1),
        name: z.string().min(1),
        slug: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.skill.findUnique({
        where: { id: input.id },
        include: { effects: { orderBy: { ordering: "asc" } } },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source skill template not found",
        });
      }

      const slug = input.slug || slugify(input.name);

      // Check if key or slug already exists
      const existing = await ctx.db.skill.findFirst({
        where: {
          OR: [
            { key: input.key },
            { slug },
          ],
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Skill with key "${input.key}" or slug "${slug}" already exists`,
        });
      }

      // Create cloned skill
      const cloned = await ctx.db.skill.create({
        data: {
          key: input.key,
          slug,
          name: input.name + " (Copy)",
          description: source.description,
          tags: (source.tags as string[] | null) ?? [],
          status: "DRAFT",
          version: 1,
          createdBy: ctx.session.user.id,
          skillType: source.skillType,
          damageType: source.damageType,
          staminaCost: source.staminaCost,
          cooldownTurns: source.cooldownTurns,
          castTimeTurns: source.castTimeTurns,
          hits: source.hits,
          targeting: source.targeting,
          maxTargets: source.maxTargets,
          basePower: source.basePower,
          scalingStat: source.scalingStat,
          scalingRatio: source.scalingRatio,
          flatBonus: source.flatBonus,
          levelUnlock: source.levelUnlock,
          effects: {
            create: source.effects.map((effect) => ({
              type: effect.type,
              stat: effect.stat,
              value: effect.value,
              ratio: effect.ratio,
              durationTurns: effect.durationTurns,
              chance: effect.chance,
              tickIntervalTurns: effect.tickIntervalTurns,
              maxStacks: effect.maxStacks,
              note: effect.note,
              ordering: effect.ordering,
            })),
          },
        },
      });

      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetEntityType: "Skill",
        targetEntityId: cloned.id,
        action: "SKILL_CLONED",
        payloadJson: { sourceId: source.id, sourceKey: source.key },
      });

      return cloned;
    }),

  // Effect management
  effects: createTRPCRouter({
    // Add effect to skill
    add: contentProcedure
      .use(async ({ ctx, next }) => {
        await requireContentPermission(ctx.session.user.id, "content.edit");
        return next({ ctx });
      })
      .input(
        z.object({
          skillId: z.string(),
          effect: skillEffectSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        const skill = await ctx.db.skill.findUnique({
          where: { id: input.skillId },
        });

        if (!skill) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Skill template not found",
          });
        }

        // Validate effect
        if (
          (input.effect.type === "BUFF_STAT" || input.effect.type === "DEBUFF_STAT") &&
          !input.effect.stat
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${input.effect.type} requires a stat`,
          });
        }

        const effect = await ctx.db.skillEffect.create({
          data: {
            skillId: input.skillId,
            ...input.effect,
          },
        });

        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "SkillEffect",
          targetEntityId: effect.id,
          action: "SKILL_EFFECT_ADDED",
          payloadJson: { skillId: input.skillId, effectType: effect.type },
        });

        return effect;
      }),

    // Update effect
    update: contentProcedure
      .use(async ({ ctx, next }) => {
        await requireContentPermission(ctx.session.user.id, "content.edit");
        return next({ ctx });
      })
      .input(
        z.object({
          id: z.string(),
          effect: skillEffectSchema.partial(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.skillEffect.findUnique({
          where: { id: input.id },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Effect not found",
          });
        }

        // Validate if stat is required
        const effectType = input.effect.type ?? existing.type;
        const stat = input.effect.stat !== undefined ? input.effect.stat : existing.stat;
        if (
          (effectType === "BUFF_STAT" || effectType === "DEBUFF_STAT") &&
          !stat
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${effectType} requires a stat`,
          });
        }

        const updated = await ctx.db.skillEffect.update({
          where: { id: input.id },
          data: input.effect,
        });

        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "SkillEffect",
          targetEntityId: updated.id,
          action: "SKILL_EFFECT_UPDATED",
          payloadJson: { skillId: existing.skillId },
        });

        return updated;
      }),

    // Delete effect
    delete: contentProcedure
      .use(async ({ ctx, next }) => {
        await requireContentPermission(ctx.session.user.id, "content.edit");
        return next({ ctx });
      })
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const effect = await ctx.db.skillEffect.findUnique({
          where: { id: input.id },
        });

        if (!effect) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Effect not found",
          });
        }

        await ctx.db.skillEffect.delete({
          where: { id: input.id },
        });

        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "SkillEffect",
          targetEntityId: input.id,
          action: "SKILL_EFFECT_DELETED",
          payloadJson: { skillId: effect.skillId },
        });

        return { success: true };
      }),

    // Reorder effects
    reorder: contentProcedure
      .use(async ({ ctx, next }) => {
        await requireContentPermission(ctx.session.user.id, "content.edit");
        return next({ ctx });
      })
      .input(
        z.object({
          skillId: z.string(),
          orderedIds: z.array(z.string()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const skill = await ctx.db.skill.findUnique({
          where: { id: input.skillId },
          include: { effects: true },
        });

        if (!skill) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Skill template not found",
          });
        }

        // Update ordering for each effect
        await Promise.all(
          input.orderedIds.map((effectId, index) =>
            ctx.db.skillEffect.update({
              where: { id: effectId },
              data: { ordering: index },
            })
          )
        );

        await logAuditEvent(ctx.db, {
          actorUserId: ctx.session.user.id,
          targetEntityType: "Skill",
          targetEntityId: input.skillId,
          action: "SKILL_EFFECTS_REORDERED",
          payloadJson: { orderedIds: input.orderedIds },
        });

        return { success: true };
      }),
  }),

  // Legacy endpoints (keep for backward compatibility)
  disable: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.disable");
      return next({ ctx });
    })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const skill = await ctx.db.skill.findUnique({
        where: { id: input.id },
      });

      if (!skill) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill template not found",
        });
      }

      const updatedSkill = await ctx.db.skill.update({
        where: { id: input.id },
        data: {
          status: "DISABLED",
        },
      });

      return updatedSkill;
    }),

  enable: contentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const skill = await ctx.db.skill.findUnique({
        where: { id: input.id },
      });

      if (!skill) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill template not found",
        });
      }

      const updatedSkill = await ctx.db.skill.update({
        where: { id: input.id },
        data: {
          status: "ACTIVE",
        },
      });

      return updatedSkill;
    }),

  delete: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.delete");
      return next({ ctx });
    })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const skill = await ctx.db.skill.findUnique({
        where: { id: input.id },
        include: {
          playerSkills: {
            take: 1,
          },
        },
      });

      if (!skill) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill template not found",
        });
      }

      if (skill.playerSkills.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete skill that is assigned to players. Disable it instead.",
        });
      }

      await ctx.db.skill.delete({
        where: { id: input.id },
      });

      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetEntityType: "Skill",
        targetEntityId: input.id,
        action: "SKILL_DELETED",
        payloadJson: { key: skill.key },
      });

      return { success: true };
    }),
});
