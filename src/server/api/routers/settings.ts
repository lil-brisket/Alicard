import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const settingsRouter = createTRPCRouter({
  // Get current user settings
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        image: true,
        gender: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Get character
    const character = await ctx.db.character.findFirst({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        gender: true,
      },
    });

    // Get profile social (for journal)
    const profile = await ctx.db.playerProfile.findUnique({
      where: { userId: ctx.session.user.id },
      include: { social: true },
    });

    return {
      username: user.username,
      name: user.name,
      email: user.email,
      avatar: user.image,
      gender: user.gender,
      characterName: character?.name ?? null,
      characterGender: character?.gender ?? null,
      journal: profile?.social?.journal ?? null,
    };
  }),

  // Update username
  updateUsername: protectedProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(3, "Username must be at least 3 characters")
          .max(20, "Username must be at most 20 characters")
          .regex(
            /^[a-zA-Z0-9_-]+$/,
            "Username can only contain letters, numbers, underscores, and hyphens"
          ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if username is already taken
      const existingUser = await ctx.db.user.findFirst({
        where: {
          username: input.username,
          NOT: { id: ctx.session.user.id },
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username is already taken",
        });
      }

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { username: input.username },
      });

      return { success: true };
    }),

  // Update password
  updatePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { password: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(input.currentPassword, user.password);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { password: hashedPassword },
      });

      return { success: true };
    }),

  // Update avatar (image URL)
  updateAvatar: protectedProcedure
    .input(
      z.object({
        avatarUrl: z.string().url("Invalid URL format").optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { image: input.avatarUrl ?? null },
      });

      return { success: true };
    }),

  // Update gender
  updateGender: protectedProcedure
    .input(
      z.object({
        gender: z.enum(["MALE", "FEMALE", "OTHER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update user gender
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { gender: input.gender },
      });

      // Update character gender
      const character = await ctx.db.character.findFirst({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
      });

      if (character) {
        await ctx.db.character.update({
          where: { id: character.id },
          data: { gender: input.gender },
        });
      }

      return { success: true };
    }),

  // Update character name
  updateCharacterName: protectedProcedure
    .input(
      z.object({
        characterName: z
          .string()
          .min(1, "Character name is required")
          .max(50, "Character name must be at most 50 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const character = await ctx.db.character.findFirst({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
      });

      if (!character) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      }

      await ctx.db.character.update({
        where: { id: character.id },
        data: { name: input.characterName },
      });

      return { success: true };
    }),

  // Update journal (BBCode)
  updateJournal: protectedProcedure
    .input(
      z.object({
        journal: z.string().max(5000, "Journal must be at most 5000 characters").optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.playerProfile.findUnique({
        where: { userId: ctx.session.user.id },
        include: { social: true },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      // Update or create social record
      if (profile.social) {
        await ctx.db.playerSocial.update({
          where: { profileId: profile.id },
          data: { journal: input.journal ?? null },
        });
      } else {
        await ctx.db.playerSocial.create({
          data: {
            profileId: profile.id,
            journal: input.journal ?? null,
          },
        });
      }

      return { success: true };
    }),
});

