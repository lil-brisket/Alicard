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

const contentStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED", "PUBLISHED", "ARCHIVED"]);

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
        stationDefinitionId: z.string().optional(),
        category: z.string().optional(),
        query: z.string().optional(),
        isActive: z.boolean().optional(),
        status: contentStatusSchema.optional(),
        levelMin: z.number().int().min(1).max(100).optional(),
        levelMax: z.number().int().min(1).max(100).optional(),
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

      if (input?.stationDefinitionId) {
        where.stationDefinitionId = input.stationDefinitionId;
      }

      if (input?.category) {
        where.category = input.category;
      }

      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input?.status) {
        where.status = input.status;
      }

      if (input?.levelMin !== undefined || input?.levelMax !== undefined) {
        where.requiredJobLevel = {};
        if (input?.levelMin !== undefined) {
          where.requiredJobLevel.gte = input.levelMin;
        }
        if (input?.levelMax !== undefined) {
          where.requiredJobLevel.lte = input.levelMax;
        }
      }

      if (input?.query) {
        // Search in recipe name, output item name, and input item names
        const searchTerm = input.query.toLowerCase();
        
        // First, find items matching the search term
        const matchingItems = await ctx.db.item.findMany({
          where: {
            OR: [
              { name: { contains: searchTerm, mode: "insensitive" } },
              { key: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        });

        const matchingItemIds = matchingItems.map((i) => i.id);

        // Find recipes that match by name, or have matching output/item inputs
        const recipesWithMatchingItems = await ctx.db.recipe.findMany({
          where: {
            OR: [
              { outputItemId: { in: matchingItemIds } },
              {
                inputs: {
                  some: {
                    itemId: { in: matchingItemIds },
                  },
                },
              },
            ],
          },
          select: { id: true },
        });

        const matchingRecipeIds = recipesWithMatchingItems.map((r) => r.id);

        where.OR = [
          { name: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
          { id: { in: matchingRecipeIds } },
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
          stationDefinition: {
            select: {
              id: true,
              key: true,
              name: true,
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
          { updatedAt: "desc" },
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
          stationDefinition: {
            select: {
              id: true,
              key: true,
              name: true,
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
        station: craftingStationSchema.optional(), // Legacy enum (for backward compatibility)
        stationDefinitionId: z.string().optional(), // Data-driven station (for alchemy)
        category: z.string().optional(), // Recipe category (POTION, BREW, OIL, etc.)
        requiredJobLevel: z.number().int().min(1).max(100).default(1),
        difficulty: z.number().int().min(1).max(10).default(1),
        craftTimeSeconds: z.number().int().min(0).default(0),
        xp: z.number().int().min(0).default(0),
        successRate: z.number().min(0).max(1).nullable().optional(), // Null = use calculated, 0-1 = override
        isDiscoverable: z.boolean().default(false),
        outputItemId: z.string().min(1, "Output item is required"),
        outputQty: z.number().int().min(1).max(9999).default(1),
        inputs: z.array(recipeInputSchema).min(1, "At least one input is required"),
        isActive: z.boolean().default(true),
        allowNonGatherableInputs: z.boolean().default(false),
        sourceGatherJobKey: z.string().optional().nullable(),
        status: contentStatusSchema.default("DRAFT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate inputs against gatherable items
      const inputItemIds = input.inputs.map((i) => i.itemId);
      const validation = await validateRecipeInputs(
        input.jobId,
        inputItemIds,
        input.allowNonGatherableInputs,
        input.sourceGatherJobKey
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

      // Verify stationDefinition exists if provided
      if (input.stationDefinitionId) {
        const station = await ctx.db.stationDefinition.findUnique({
          where: { id: input.stationDefinitionId },
        });

        if (!station) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Station definition not found",
          });
        }

        if (!station.isEnabled || station.status !== "ACTIVE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Station is not enabled or active",
          });
        }
      }

      // Require either station (enum) or stationDefinitionId (not both)
      if (!input.station && !input.stationDefinitionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either station (enum) or stationDefinitionId must be provided",
        });
      }

      if (input.station && input.stationDefinitionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot specify both station (enum) and stationDefinitionId. Use one or the other.",
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
              station: input.station ?? null,
              stationDefinitionId: input.stationDefinitionId ?? null,
              category: input.category ?? null,
              requiredJobLevel: input.requiredJobLevel,
              difficulty: input.difficulty,
              craftTimeSeconds: input.craftTimeSeconds,
              xp: input.xp,
              successRate: input.successRate ?? null,
              isDiscoverable: input.isDiscoverable,
              outputItemId: input.outputItemId,
              outputQty: input.outputQty,
              isActive: input.isActive,
              allowNonGatherableInputs: input.allowNonGatherableInputs,
              sourceGatherJobKey: input.sourceGatherJobKey ?? null,
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
              stationDefinition: true,
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
        station: craftingStationSchema.optional().nullable(),
        stationDefinitionId: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        requiredJobLevel: z.number().int().min(1).max(100).optional(),
        difficulty: z.number().int().min(1).max(10).optional(),
        craftTimeSeconds: z.number().int().min(0).optional(),
        xp: z.number().int().min(0).optional(),
        successRate: z.number().min(0).max(1).nullable().optional(),
        isDiscoverable: z.boolean().optional(),
        outputItemId: z.string().optional(),
        outputQty: z.number().int().min(1).max(9999).optional(),
        inputs: z.array(recipeInputSchema).optional(),
        isActive: z.boolean().optional(),
        allowNonGatherableInputs: z.boolean().optional(),
        sourceGatherJobKey: z.string().optional().nullable(),
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
        const sourceGatherJobKey =
          updateData.sourceGatherJobKey !== undefined
            ? updateData.sourceGatherJobKey
            : existingRecipe.sourceGatherJobKey;

        const inputItemIds = inputs.map((i) => i.itemId);
        const validation = await validateRecipeInputs(
          jobId,
          inputItemIds,
          allowNonGatherable,
          sourceGatherJobKey
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

      // Validate stationDefinition if being updated
      if (input.stationDefinitionId !== undefined && input.stationDefinitionId !== null) {
        const station = await ctx.db.stationDefinition.findUnique({
          where: { id: input.stationDefinitionId },
        });

        if (!station) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Station definition not found",
          });
        }

        if (!station.isEnabled || station.status !== "ACTIVE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Station is not enabled or active",
          });
        }
      }

      // Validate: cannot have both station enum and stationDefinitionId
      const finalStation = input.station !== undefined ? input.station : existingRecipe.station;
      const finalStationDefId = input.stationDefinitionId !== undefined ? input.stationDefinitionId : existingRecipe.stationDefinitionId;

      if (finalStation && finalStationDefId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot specify both station (enum) and stationDefinitionId. Use one or the other.",
        });
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
            stationDefinition: true,
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
            stationDefinitionId: source.stationDefinitionId,
            category: source.category,
            requiredJobLevel: source.requiredJobLevel,
            difficulty: source.difficulty,
            craftTimeSeconds: source.craftTimeSeconds,
            xp: source.xp,
            successRate: source.successRate,
            isDiscoverable: source.isDiscoverable,
            outputItemId: source.outputItemId,
            outputQty: source.outputQty,
            isActive: false, // Start as inactive
            allowNonGatherableInputs: source.allowNonGatherableInputs,
            sourceGatherJobKey: source.sourceGatherJobKey,
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
            stationDefinition: true,
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

  // Bulk update recipes
  bulkUpdate: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.edit");
      return next({ ctx });
    })
    .input(
      z.object({
        recipeIds: z.array(z.string()).min(1),
        patch: z.object({
          isActive: z.boolean().optional(),
          station: craftingStationSchema.optional(),
          requiredJobLevel: z.number().int().min(1).max(100).optional(),
          xp: z.number().int().min(0).optional(),
          craftTimeSeconds: z.number().int().min(0).optional(),
          // Level offset (adds to existing level)
          levelOffset: z.number().int().optional(),
          // XP adjust (percentage multiplier or set value)
          xpAdjustPercent: z.number().optional(),
          xpSetValue: z.number().int().min(0).optional(),
          // Time adjust (percentage multiplier or set value)
          timeAdjustPercent: z.number().optional(),
          timeSetValue: z.number().int().min(0).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const recipes = await ctx.db.recipe.findMany({
        where: { id: { in: input.recipeIds } },
      });

      if (recipes.length !== input.recipeIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more recipes not found",
        });
      }

      const updates = await Promise.all(
        recipes.map(async (recipe) => {
          const updateData: any = {};

          if (input.patch.isActive !== undefined) {
            updateData.isActive = input.patch.isActive;
          }

          if (input.patch.station !== undefined) {
            updateData.station = input.patch.station;
          }

          if (input.patch.requiredJobLevel !== undefined) {
            updateData.requiredJobLevel = input.patch.requiredJobLevel;
          } else if (input.patch.levelOffset !== undefined) {
            updateData.requiredJobLevel = Math.max(
              1,
              Math.min(100, recipe.requiredJobLevel + input.patch.levelOffset)
            );
          }

          if (input.patch.xpSetValue !== undefined) {
            updateData.xp = input.patch.xpSetValue;
          } else if (input.patch.xpAdjustPercent !== undefined) {
            updateData.xp = Math.max(0, Math.floor(recipe.xp * (1 + input.patch.xpAdjustPercent / 100)));
          } else if (input.patch.xp !== undefined) {
            updateData.xp = input.patch.xp;
          }

          if (input.patch.timeSetValue !== undefined) {
            updateData.craftTimeSeconds = input.patch.timeSetValue;
          } else if (input.patch.timeAdjustPercent !== undefined) {
            updateData.craftTimeSeconds = Math.max(
              0,
              Math.floor(recipe.craftTimeSeconds * (1 + input.patch.timeAdjustPercent / 100))
            );
          } else if (input.patch.craftTimeSeconds !== undefined) {
            updateData.craftTimeSeconds = input.patch.craftTimeSeconds;
          }

          return ctx.db.recipe.update({
            where: { id: recipe.id },
            data: updateData,
          });
        })
      );

      return { count: updates.length };
    }),

  // Bulk import recipes (JSON)
  bulkImport: contentProcedure
    .use(async ({ ctx, next }) => {
      await requireContentPermission(ctx.session.user.id, "content.create");
      return next({ ctx });
    })
    .input(
      z.object({
        jobId: z.string().min(1),
        recipes: z.array(
          z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            tags: z.array(z.string()).optional(),
            station: craftingStationSchema.optional(),
            stationDefinitionId: z.string().optional(),
            category: z.string().optional(),
            requiredJobLevel: z.number().int().min(1).max(100).default(1),
            difficulty: z.number().int().min(1).max(10).default(1),
            craftTimeSeconds: z.number().int().min(0).default(0),
            xp: z.number().int().min(0).default(0),
            successRate: z.number().min(0).max(1).nullable().optional(),
            isDiscoverable: z.boolean().default(false),
            outputItemId: z.string().min(1),
            outputQty: z.number().int().min(1).max(9999).default(1),
            inputs: z.array(recipeInputSchema).min(1),
            isActive: z.boolean().default(true),
            allowNonGatherableInputs: z.boolean().default(false),
            sourceGatherJobKey: z.string().optional().nullable(),
            status: contentStatusSchema.default("DRAFT"),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const errors: Array<{ index: number; message: string }> = [];
      const created: string[] = [];

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

      for (let i = 0; i < input.recipes.length; i++) {
        const recipeData = input.recipes[i];

        try {
          // Validate inputs
          const inputItemIds = recipeData.inputs.map((inp) => inp.itemId);
          const validation = await validateRecipeInputs(
            input.jobId,
            inputItemIds,
            recipeData.allowNonGatherableInputs,
            recipeData.sourceGatherJobKey
          );

          if (!validation.valid) {
            const invalidItems = await ctx.db.item.findMany({
              where: { id: { in: validation.invalidItemIds } },
              select: { name: true },
            });

            errors.push({
              index: i,
              message: `Invalid input items: ${invalidItems.map((i) => i.name).join(", ")}`,
            });
            continue;
          }

          // Verify output item exists
          const outputItem = await ctx.db.item.findUnique({
            where: { id: recipeData.outputItemId },
          });

          if (!outputItem) {
            errors.push({
              index: i,
              message: `Output item not found: ${recipeData.outputItemId}`,
            });
            continue;
          }

          // Verify all input items exist
          const inputItems = await ctx.db.item.findMany({
            where: { id: { in: inputItemIds } },
          });

          if (inputItems.length !== inputItemIds.length) {
            errors.push({
              index: i,
              message: "One or more input items not found",
            });
            continue;
          }

          // Validate station if provided
          if (recipeData.stationDefinitionId) {
            const station = await ctx.db.stationDefinition.findUnique({
              where: { id: recipeData.stationDefinitionId },
            });

            if (!station) {
              errors.push({
                index: i,
                message: `Station definition not found: ${recipeData.stationDefinitionId}`,
              });
              continue;
            }

            if (!station.isEnabled || station.status !== "ACTIVE") {
              errors.push({
                index: i,
                message: `Station is not enabled or active: ${station.name}`,
              });
              continue;
            }
          }

          // Require either station or stationDefinitionId (not both)
          if (!recipeData.station && !recipeData.stationDefinitionId) {
            errors.push({
              index: i,
              message: "Either station (enum) or stationDefinitionId must be provided",
            });
            continue;
          }

          if (recipeData.station && recipeData.stationDefinitionId) {
            errors.push({
              index: i,
              message: "Cannot specify both station (enum) and stationDefinitionId",
            });
            continue;
          }

          // Create recipe
          const recipe = await ctx.db.$transaction(async (tx) => {
            const created = await tx.recipe.create({
              data: {
                name: recipeData.name,
                description: recipeData.description,
                tags: recipeData.tags ?? [],
                status: recipeData.status,
                jobId: input.jobId,
                station: recipeData.station ?? null,
                stationDefinitionId: recipeData.stationDefinitionId ?? null,
                category: recipeData.category ?? null,
                requiredJobLevel: recipeData.requiredJobLevel,
                difficulty: recipeData.difficulty,
                craftTimeSeconds: recipeData.craftTimeSeconds,
                xp: recipeData.xp,
                successRate: recipeData.successRate ?? null,
                isDiscoverable: recipeData.isDiscoverable,
                outputItemId: recipeData.outputItemId,
                outputQty: recipeData.outputQty,
                isActive: recipeData.isActive,
                allowNonGatherableInputs: recipeData.allowNonGatherableInputs,
                sourceGatherJobKey: recipeData.sourceGatherJobKey ?? null,
                createdBy: ctx.session.user.id,
              },
            });

            await tx.recipeInput.createMany({
              data: recipeData.inputs.map((inp) => ({
                recipeId: created.id,
                itemId: inp.itemId,
                qty: inp.qty,
              })),
            });

            return created.id;
          });

          created.push(recipe);
        } catch (error: any) {
          errors.push({
            index: i,
            message: error?.message || "Failed to create recipe",
          });
        }
      }

      return {
        created: created.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  // Get recipes for export (JSON)
  exportRecipes: contentProcedure
    .input(
      z.object({
        recipeIds: z.array(z.string()).optional(),
        jobId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input.recipeIds && input.recipeIds.length > 0) {
        where.id = { in: input.recipeIds };
      } else if (input.jobId) {
        where.jobId = input.jobId;
      }

      const recipes = await ctx.db.recipe.findMany({
        where,
        include: {
          inputs: true,
        },
      });

      return recipes.map((r) => ({
        name: r.name,
        description: r.description,
        tags: (r.tags as string[] | null) ?? [],
        station: r.station,
        stationDefinitionId: r.stationDefinitionId,
        category: r.category,
        requiredJobLevel: r.requiredJobLevel,
        difficulty: r.difficulty,
        craftTimeSeconds: r.craftTimeSeconds,
        xp: r.xp,
        successRate: r.successRate,
        isDiscoverable: r.isDiscoverable,
        outputItemId: r.outputItemId,
        outputQty: r.outputQty,
        inputs: r.inputs.map((inp) => ({
          itemId: inp.itemId,
          qty: inp.qty,
        })),
        isActive: r.isActive,
        allowNonGatherableInputs: r.allowNonGatherableInputs,
        sourceGatherJobKey: r.sourceGatherJobKey,
        status: r.status,
      }));
    }),
});

