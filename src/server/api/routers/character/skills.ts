import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

const slotIndexSchema = z.number().int().min(1).max(8);

export const skillsRouter = createTRPCRouter({
  // Get all learned skills for the player
  getLearned: protectedProcedure.query(async ({ ctx }) => {
    const player = await ctx.db.player.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!player || player.isDeleted) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Character not found",
      });
    }

    const playerSkills = await ctx.db.playerSkill.findMany({
      where: { playerId: player.id },
      include: {
        skill: true,
      },
      orderBy: {
        skill: {
          name: "asc",
        },
      },
    });

    return playerSkills.map((ps) => ({
      id: ps.id,
      skill: ps.skill,
      learnedAt: ps.learnedAt,
    }));
  }),

  // Get current skill loadout (8-slot bar)
  getLoadout: protectedProcedure.query(async ({ ctx }) => {
    const player = await ctx.db.player.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!player || player.isDeleted) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Character not found",
      });
    }

    let loadout = await ctx.db.playerSkillLoadout.findUnique({
      where: { playerId: player.id },
      include: {
        slot1Skill: true,
        slot2Skill: true,
        slot3Skill: true,
        slot4Skill: true,
        slot5Skill: true,
        slot6Skill: true,
        slot7Skill: true,
        slot8Skill: true,
      },
    });

    // Create empty loadout if it doesn't exist
    if (!loadout) {
      loadout = await ctx.db.playerSkillLoadout.create({
        data: { playerId: player.id },
        include: {
          slot1Skill: true,
          slot2Skill: true,
          slot3Skill: true,
          slot4Skill: true,
          slot5Skill: true,
          slot6Skill: true,
          slot7Skill: true,
          slot8Skill: true,
        },
      });
    }

    // Return as array of slots
    return {
      slots: [
        { slotIndex: 1, skill: loadout.slot1Skill },
        { slotIndex: 2, skill: loadout.slot2Skill },
        { slotIndex: 3, skill: loadout.slot3Skill },
        { slotIndex: 4, skill: loadout.slot4Skill },
        { slotIndex: 5, skill: loadout.slot5Skill },
        { slotIndex: 6, skill: loadout.slot6Skill },
        { slotIndex: 7, skill: loadout.slot7Skill },
        { slotIndex: 8, skill: loadout.slot8Skill },
      ],
    };
  }),

  // Equip a skill to a slot (replaces existing if any)
  equip: protectedProcedure
    .input(
      z.object({
        skillId: z.string(),
        slotIndex: slotIndexSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      }

      // Verify player has learned this skill
      const playerSkill = await ctx.db.playerSkill.findUnique({
        where: {
          playerId_skillId: {
            playerId: player.id,
            skillId: input.skillId,
          },
        },
      });

      if (!playerSkill) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Skill not learned",
        });
      }

      // Get or create loadout
      let loadout = await ctx.db.playerSkillLoadout.findUnique({
        where: { playerId: player.id },
      });

      if (!loadout) {
        loadout = await ctx.db.playerSkillLoadout.create({
          data: { playerId: player.id },
        });
      }

      // Determine which slot field to update
      type SlotField = `slot${number}SkillId`;
      const slotField: SlotField = `slot${input.slotIndex}SkillId` as SlotField;

      // Use transaction to handle replacement
      await ctx.db.$transaction(async (tx) => {
        // If slot is occupied, we just replace it (no need to "unequip" skills)
        await tx.playerSkillLoadout.update({
          where: { playerId: player.id },
          data: {
            [slotField]: input.skillId,
          },
        });
      });

      return { success: true };
    }),

  // Unequip a skill from a slot
  unequip: protectedProcedure
    .input(
      z.object({
        slotIndex: slotIndexSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!player || player.isDeleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      }

      const loadout = await ctx.db.playerSkillLoadout.findUnique({
        where: { playerId: player.id },
      });

      if (!loadout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No loadout found",
        });
      }

      type SlotField = `slot${number}SkillId`;
      const slotField: SlotField = `slot${input.slotIndex}SkillId` as SlotField;
      const currentSkillId = loadout[slotField as keyof typeof loadout] as string | null;

      if (!currentSkillId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Slot is already empty",
        });
      }

      await ctx.db.playerSkillLoadout.update({
        where: { playerId: player.id },
        data: {
          [slotField]: null,
        } as Record<SlotField, null>,
      });

      return { success: true };
    }),
});
