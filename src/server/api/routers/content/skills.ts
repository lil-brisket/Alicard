import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";
import { requireContentPermission } from "~/server/lib/admin-auth";

const contentStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED"]);

export const contentSkillsRouter = createTRPCRouter({
  // List all skill templates with filtering
  list: contentProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
        status: contentStatusSchema.optional(),
        tags: z.array(z.string()).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      
      if (input.status) {
        where.status = input.status;
      }
      
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { key: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      let skills = await ctx.db.skill.findMany({
        where,
        take: input.limit * 2, // Fetch more to account for tag filtering
        orderBy: {
          createdAt: "desc",
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

  // Get skill template by ID
  get: contentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const skill = await ctx.db.skill.findUnique({
        where: { id: input.id },
      });

      if (!skill) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill template not found",
        });
      }

      return skill;
    }),

  // Create new skill template (requires content.create permission)
  create: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.create");
      return next({ ctx });
    })
    .input(
      z.object({
        key: z.string().min(1, "Key is required"),
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: contentStatusSchema.default("DRAFT"),
        staminaCost: z.number().min(0).default(0),
        cooldownTurns: z.number().min(0).default(0),
        levelUnlock: z.number().min(1).optional(),
        cloneFromId: z.string().optional(), // For inheritance/cloning
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { cloneFromId, ...data } = input;
      
      // Check if key already exists
      const existing = await ctx.db.skill.findUnique({
        where: { key: input.key },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Skill with key "${input.key}" already exists`,
        });
      }
      
      let baseData: any = {
        ...data,
        tags: input.tags ? input.tags : [],
        version: 1,
        createdBy: ctx.session.user.id,
      };
      
      // If cloning, copy data from source
      if (cloneFromId) {
        const source = await ctx.db.skill.findUnique({
          where: { id: cloneFromId },
        });
        
        if (!source) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Source skill template not found",
          });
        }
        
        baseData = {
          ...baseData,
          staminaCost: source.staminaCost,
          cooldownTurns: source.cooldownTurns,
          levelUnlock: source.levelUnlock,
          // Don't copy name, description, tags, status - those should be new
        };
      }

      try {
        const skill = await ctx.db.skill.create({
          data: baseData,
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

  // Update skill template (requires content.edit permission)
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
        description: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        status: contentStatusSchema.optional(),
        staminaCost: z.number().min(0).optional(),
        cooldownTurns: z.number().min(0).optional(),
        levelUnlock: z.number().min(1).optional().nullable(),
        affectsExisting: z.boolean().default(false), // Versioning: if false, only affects new skills
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, affectsExisting, ...updateData } = input;

      const skill = await ctx.db.skill.findUnique({
        where: { id },
      });

      if (!skill) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill template not found",
        });
      }

      // Check if key conflict exists (if key is being updated)
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

      // If not affecting existing skills, increment version
      const versionIncrement = affectsExisting ? 0 : 1;
      
      const updatedSkill = await ctx.db.skill.update({
        where: { id },
        data: {
          ...updateData,
          version: skill.version + versionIncrement,
        },
      });

      return updatedSkill;
    }),

  // Disable skill template (requires content.disable permission)
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

  // Enable skill template (set status to ACTIVE)
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

  // Clone skill template (inheritance)
  clone: contentProcedure
    .input(
      z.object({
        id: z.string(),
        key: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.skill.findUnique({
        where: { id: input.id },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source skill template not found",
        });
      }

      // Check if key already exists
      const existing = await ctx.db.skill.findUnique({
        where: { key: input.key },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Skill with key "${input.key}" already exists`,
        });
      }

      const cloned = await ctx.db.skill.create({
        data: {
          key: input.key,
          name: input.name,
          description: input.description ?? source.description,
          tags: input.tags ?? (source.tags as string[] | null) ?? [],
          status: "DRAFT",
          version: 1,
          createdBy: ctx.session.user.id,
          staminaCost: source.staminaCost,
          cooldownTurns: source.cooldownTurns,
          levelUnlock: source.levelUnlock,
        },
      });

      return cloned;
    }),

  // Hard delete (requires content.delete permission - ADMIN only)
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

      // Check if skill is used by players
      if (skill.playerSkills.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete skill that is assigned to players. Disable it instead.",
        });
      }

      await ctx.db.skill.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
