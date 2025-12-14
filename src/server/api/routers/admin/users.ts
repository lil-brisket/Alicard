import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  moderatorProcedure,
  adminProcedure,
} from "~/server/api/trpc";

export const adminUsersRouter = createTRPCRouter({
  // Search users by username, email, or ID
  searchUsers: moderatorProcedure
    .input(
      z.object({
        query: z.string().min(1, "Query must be at least 1 character"),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          OR: [
            { username: { contains: input.query, mode: "insensitive" } },
            { email: { contains: input.query, mode: "insensitive" } },
            { id: { equals: input.query } },
          ],
          deletedAt: null, // Exclude soft-deleted users
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isBanned: true,
          bannedUntil: true,
          isMuted: true,
          mutedUntil: true,
          createdAt: true,
          _count: {
            select: {
              characters: true,
            },
          },
        },
        take: input.limit,
        orderBy: {
          createdAt: "desc",
        },
      });

      return users;
    }),

  // Get user by ID with full details including characters
  getUserById: moderatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        include: {
          characters: {
            select: {
              id: true,
              name: true,
              level: true,
              currentHp: true,
              maxHp: true,
              deaths: true,
              createdAt: true,
            },
          },
          player: {
            select: {
              id: true,
              characterName: true,
              level: true,
              gold: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  // Update user fields (moderator can update most, admin can update role)
  updateUser: moderatorProcedure
    .input(
      z.object({
        id: z.string(),
        username: z.string().optional(),
        role: z.enum(["PLAYER", "MODERATOR", "ADMIN"]).optional(),
        isBanned: z.boolean().optional(),
        bannedUntil: z.date().nullable().optional(),
        banReason: z.string().nullable().optional(),
        isMuted: z.boolean().optional(),
        mutedUntil: z.date().nullable().optional(),
        muteReason: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, role, ...updateData } = input;

      // Only ADMIN can change roles
      if (role !== undefined && ctx.userRole !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can change user roles",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id },
        data: {
          ...updateData,
          ...(role !== undefined && { role }),
        },
      });

      // Log admin action
      await ctx.db.adminActionLog.create({
        data: {
          actorId: ctx.session.user.id,
          targetUserId: id,
          action: "UPDATE_USER",
          reason: `Updated user fields: ${Object.keys(updateData).join(", ")}${role ? `, role: ${role}` : ""}`,
          metadata: {
            changes: updateData,
            ...(role && { roleChange: role }),
          },
        },
      });

      return updatedUser;
    }),

  // Ban user
  banUser: moderatorProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1, "Reason is required"),
        until: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: input.id },
        data: {
          isBanned: true,
          bannedUntil: input.until ?? null,
          banReason: input.reason,
        },
      });

      // Log admin action
      await ctx.db.adminActionLog.create({
        data: {
          actorId: ctx.session.user.id,
          targetUserId: input.id,
          action: "BAN_USER",
          reason: input.reason,
          metadata: {
            bannedUntil: input.until,
          },
        },
      });

      return updatedUser;
    }),

  // Unban user
  unbanUser: moderatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: input.id },
        data: {
          isBanned: false,
          bannedUntil: null,
          banReason: null,
        },
      });

      // Log admin action
      await ctx.db.adminActionLog.create({
        data: {
          actorId: ctx.session.user.id,
          targetUserId: input.id,
          action: "UNBAN_USER",
          reason: "User unbanned",
        },
      });

      return updatedUser;
    }),

  // Mute user
  muteUser: moderatorProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1, "Reason is required"),
        until: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: input.id },
        data: {
          isMuted: true,
          mutedUntil: input.until ?? null,
          muteReason: input.reason,
        },
      });

      // Log admin action
      await ctx.db.adminActionLog.create({
        data: {
          actorId: ctx.session.user.id,
          targetUserId: input.id,
          action: "MUTE_USER",
          reason: input.reason,
          metadata: {
            mutedUntil: input.until,
          },
        },
      });

      return updatedUser;
    }),

  // Unmute user
  unmuteUser: moderatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: input.id },
        data: {
          isMuted: false,
          mutedUntil: null,
          muteReason: null,
        },
      });

      // Log admin action
      await ctx.db.adminActionLog.create({
        data: {
          actorId: ctx.session.user.id,
          targetUserId: input.id,
          action: "UNMUTE_USER",
          reason: "User unmuted",
        },
      });

      return updatedUser;
    }),

  // Soft delete user (ADMIN only)
  softDeleteUser: adminProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1, "Reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: input.id },
        data: {
          deletedAt: new Date(),
        },
      });

      // Log admin action
      await ctx.db.adminActionLog.create({
        data: {
          actorId: ctx.session.user.id,
          targetUserId: input.id,
          action: "SOFT_DELETE_USER",
          reason: input.reason,
        },
      });

      return updatedUser;
    }),

  // List admin actions (audit log)
  listAdminActions: moderatorProcedure
    .input(
      z.object({
        targetUserId: z.string().optional(),
        targetCharacterId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const actions = await ctx.db.adminActionLog.findMany({
        where: {
          ...(input.targetUserId && { targetUserId: input.targetUserId }),
          ...(input.targetCharacterId && {
            targetCharacterId: input.targetCharacterId,
          }),
        },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        take: input.limit,
        orderBy: {
          createdAt: "desc",
        },
      });

      return actions;
    }),
});
