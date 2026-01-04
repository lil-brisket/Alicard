import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  contentProcedure,
} from "~/server/api/trpc";
import { requireContentPermission } from "~/server/lib/admin-auth";
import {
  validateRecipeInputs,
} from "~/server/lib/recipe-validation";

const craftingStationSchema = z.enum([
  "SMELTER",
  "ANVIL",
  "FORGE",
  "TEMPERING_RACK",
]);

const contentStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED"]);

const recipeInputSchema = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().min(1).max(9999),
});

const recipeOutputSchema = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().min(1).max(9999),
});

export const contentRecipesRouter = createTRPCRouter({
  // List recipes with filtering
  list: contentProcedure
    .input(
      z.object({
        jobId: z.string().optional(),
        station: craftingStationSchema.optional(),
        query: z.string().optional(),
        isActive: z.boolean().optional(),
        status: contentStatusSchema.optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.jobId) {
        where.jobId = input.jobId;
      }

      if (input?.station) {
        where.station = input.station;
      }

      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input?.status) {
        where.status = input.status;
      }

      if (input?.query) {
        where.OR = [
          { name: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
        ];
      }

      return await ctx.db.recipe.findMany({
        where,
        include: {
          job: true,
          outputItem: {
            select: {
              id: true,
              name: true,
              itemType: true,
            },
          },
          inputs: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  itemType: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: [
          { requiredJobLevel: "asc" },
          { name: "asc" },
        ],
        take: input?.limit ?? 50,
      });
    }),

  // Get recipe by ID
  get: contentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const recipe = await ctx.db.recipe.findUnique({
        where: { id: input.id },
        include: {
          job: true,
          outputItem: {
            select: {
              id: true,
              name: true,
              itemType: true,
              description: true,
            },
          },
          inputs: {
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
            orderBy: {
              createdAt: "asc",
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

  // Create new recipe (requires content.create permission)
  create: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.create");
      return next({ ctx });
    })
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        jobId: z.string().min(1, "Job ID is required"),
        station: craftingStationSchema,
        requiredJobLevel: z.number().int().min(1).max(100).default(1),
        difficulty: z.number().int().min(1).max(10).default(1),
        craftTimeSeconds: z.number().int().min(0).default(0),
        xp: z.number().int().min(0).default(0),
        outputItemId: z.string().min(1, "Output item is required"),
        outputQty: z.number().int().min(1).max(9999).default(1),
        inputs: z.array(recipeInputSchema).min(1, "At least one input is required"),
        isActive: z.boolean().default(true),
        allowNonGatherableInputs: z.boolean().default(false),
        status: contentStatusSchema.default("DRAFT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate inputs against gatherable items
      const inputItemIds = input.inputs.map((i) => i.itemId);
      const validation = await validateRecipeInputs(
        input.jobId,
        inputItemIds,
        input.allowNonGatherableInputs
      );

      if (!validation.valid) {
        // Get item names for error message
        const invalidItems = await ctx.db.item.findMany({
          where: {
            id: { in: validation.invalidItemIds },
          },
          select: { id: true, name: true },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid input items (not gatherable or from recipes): ${invalidItems.map((i) => i.name).join(", ")}. Enable "Allow non-gatherable inputs" to override.`,
        });
      }

      // Verify output item exists
      const outputItem = await ctx.db.item.findUnique({
        where: { id: input.outputItemId },
      });

      if (!outputItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Output item not found",
        });
      }

      // Verify all input items exist
      const inputItems = await ctx.db.item.findMany({
        where: {
          id: { in: inputItemIds },
        },
      });

      if (inputItems.length !== inputItemIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more input items not found",
        });
      }

      // Verify job exists
      const job = await ctx.db.job.findUnique({
        where: { id: input.jobId },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      try {
        // Create recipe with inputs in a transaction
        const recipe = await ctx.db.$transaction(async (tx) => {
          const created = await tx.recipe.create({
            data: {
              name: input.name,
              description: input.description,
              tags: input.tags ?? [],
              status: input.status,
              jobId: input.jobId,
              station: input.station,
              requiredJobLevel: input.requiredJobLevel,
              difficulty: input.difficulty,
              craftTimeSeconds: input.craftTimeSeconds,
              xp: input.xp,
              outputItemId: input.outputItemId,
              outputQty: input.outputQty,
              isActive: input.isActive,
              allowNonGatherableInputs: input.allowNonGatherableInputs,
              createdBy: ctx.session.user.id,
            },
          });

          // Create recipe inputs
          await tx.recipeInput.createMany({
            data: input.inputs.map((inp) => ({
              recipeId: created.id,
              itemId: inp.itemId,
              qty: inp.qty,
            })),
          });

          // Return recipe with relations
          return await tx.recipe.findUnique({
            where: { id: created.id },
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
        });

        return recipe!;
      } catch (error: any) {
        console.error("Error creating recipe:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message || "Failed to create recipe",
          cause: error,
        });
      }
    }),

  // Update recipe (requires content.edit permission)
  update: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        jobId: z.string().optional(),
        station: craftingStationSchema.optional(),
        requiredJobLevel: z.number().int().min(1).max(100).optional(),
        difficulty: z.number().int().min(1).max(10).optional(),
        craftTimeSeconds: z.number().int().min(0).optional(),
        xp: z.number().int().min(0).optional(),
        outputItemId: z.string().optional(),
        outputQty: z.number().int().min(1).max(9999).optional(),
        inputs: z.array(recipeInputSchema).optional(),
        isActive: z.boolean().optional(),
        allowNonGatherableInputs: z.boolean().optional(),
        status: contentStatusSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, inputs, ...updateData } = input;

      const existingRecipe = await ctx.db.recipe.findUnique({
        where: { id },
      });

      if (!existingRecipe) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recipe not found",
        });
      }

      // If inputs are being updated, validate them
      if (inputs !== undefined) {
        const jobId = updateData.jobId ?? existingRecipe.jobId;
        const allowNonGatherable =
          updateData.allowNonGatherableInputs ??
          existingRecipe.allowNonGatherableInputs;

        const inputItemIds = inputs.map((i) => i.itemId);
        const validation = await validateRecipeInputs(
          jobId,
          inputItemIds,
          allowNonGatherable
        );

        if (!validation.valid) {
          const invalidItems = await ctx.db.item.findMany({
            where: {
              id: { in: validation.invalidItemIds },
            },
            select: { id: true, name: true },
          });

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid input items: ${invalidItems.map((i) => i.name).join(", ")}`,
          });
        }
      }

      // Update recipe and inputs in transaction
      const updated = await ctx.db.$transaction(async (tx) => {
        // Update recipe
        const recipe = await tx.recipe.update({
          where: { id },
          data: updateData,
        });

        // Update inputs if provided
        if (inputs !== undefined) {
          // Delete existing inputs
          await tx.recipeInput.deleteMany({
            where: { recipeId: id },
          });

          // Create new inputs
          await tx.recipeInput.createMany({
            data: inputs.map((inp) => ({
              recipeId: id,
              itemId: inp.itemId,
              qty: inp.qty,
            })),
          });
        }

        // Return updated recipe with relations
        return await tx.recipe.findUnique({
          where: { id },
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
      });

      return updated!;
    }),

  // Delete recipe (requires content.delete permission - ADMIN only)
  delete: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.delete");
      return next({ ctx });
    })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const recipe = await ctx.db.recipe.findUnique({
        where: { id: input.id },
      });

      if (!recipe) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recipe not found",
        });
      }

      // Soft delete: set status to DISABLED and isActive to false
      await ctx.db.recipe.update({
        where: { id: input.id },
        data: {
          status: "DISABLED",
          isActive: false,
        },
      });

      return { success: true };
    }),

  // Duplicate/clone recipe
  duplicate: contentProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.recipe.findUnique({
        where: { id: input.id },
        include: {
          inputs: true,
        },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source recipe not found",
        });
      }

      const cloned = await ctx.db.$transaction(async (tx) => {
        const recipe = await tx.recipe.create({
          data: {
            name: input.name,
            description: source.description,
            tags: (source.tags as string[] | null) ?? [],
            status: "DRAFT",
            version: 1,
            createdBy: ctx.session.user.id,
            jobId: source.jobId,
            station: source.station,
            requiredJobLevel: source.requiredJobLevel,
            difficulty: source.difficulty,
            craftTimeSeconds: source.craftTimeSeconds,
            xp: source.xp,
            outputItemId: source.outputItemId,
            outputQty: source.outputQty,
            isActive: false, // Start as inactive
            allowNonGatherableInputs: source.allowNonGatherableInputs,
          },
        });

        // Clone inputs
        await tx.recipeInput.createMany({
          data: source.inputs.map((inp) => ({
            recipeId: recipe.id,
            itemId: inp.itemId,
            qty: inp.qty,
          })),
        });

        return await tx.recipe.findUnique({
          where: { id: recipe.id },
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
      });

      return cloned!;
    }),
});

