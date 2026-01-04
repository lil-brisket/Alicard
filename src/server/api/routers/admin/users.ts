import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  moderatorProcedure,
  adminProcedure,
} from "~/server/api/trpc";
import { logAuditEvent, getIpAddress, getUserAgent } from "~/server/lib/audit";

export const adminUsersRouter = createTRPCRouter({
  // List users with pagination
  listUsers: moderatorProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(15),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const [users, total] = await Promise.all([
        ctx.db.user.findMany({
          where: {
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
          skip,
          take: input.limit,
          orderBy: {
            createdAt: "desc",
          },
        }),
        ctx.db.user.count({
          where: {
            deletedAt: null,
          },
        }),
      ]);

      return {
        users,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

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

  // Get user by ID with full details including characters, roles, and IP history
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
              permDeaths: true,
              createdAt: true,
            },
          },
          player: {
            select: {
              id: true,
              characterName: true,
              level: true,
              experience: true,
              gold: true,
              userJobs: {
                include: {
                  job: {
                    select: {
                      id: true,
                      key: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          roles: {
            select: {
              id: true,
              role: true,
              assignedAt: true,
              assignedBy: true,
            },
          },
          ipHistory: {
            orderBy: {
              createdAt: "desc",
            },
            take: 50,
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

  // Update user fields (moderator can update most, admin can update roles)
  updateUser: moderatorProcedure
    .input(
      z.object({
        id: z.string(),
        username: z.string().optional(),
        role: z.enum(["PLAYER", "MODERATOR", "ADMIN", "CONTENT"]).optional(), // Legacy single role
        roles: z.array(z.enum(["PLAYER", "MODERATOR", "ADMIN", "CONTENT"])).optional(), // Multi-role support
        credit: z.number().optional(),
        isBanned: z.boolean().optional(),
        bannedUntil: z.date().nullable().optional(),
        banReason: z.string().nullable().optional(),
        isMuted: z.boolean().optional(),
        mutedUntil: z.date().nullable().optional(),
        muteReason: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, role, roles, ...updateData } = input;

      // Only ADMIN can change roles
      if ((role !== undefined || roles !== undefined) && ctx.userRole !== "ADMIN") {
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

      // Update multi-roles if provided
      if (roles !== undefined) {
        // Delete all existing role assignments
        await ctx.db.userRoleAssignment.deleteMany({
          where: { userId: id },
        });

        // Create new role assignments
        await ctx.db.userRoleAssignment.createMany({
          data: roles.map((r) => ({
            userId: id,
            role: r,
            assignedBy: ctx.session.user.id,
          })),
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id },
        data: {
          ...updateData,
          ...(role !== undefined && { role }), // Legacy single role field
        },
      });

      // Log admin action
      await ctx.db.adminActionLog.create({
        data: {
          actorId: ctx.session.user.id,
          targetUserId: id,
          action: "UPDATE_USER",
          reason: `Updated user fields: ${Object.keys(updateData).join(", ")}${role ? `, role: ${role}` : ""}${roles ? `, roles: ${roles.join(", ")}` : ""}`,
          metadata: {
            changes: updateData,
            ...(role && { roleChange: role }),
            ...(roles && { rolesChange: roles }),
          },
        },
      });

      return updatedUser;
    }),

  // Update character perm deaths (ADMIN only)
  updatePermDeaths: adminProcedure
    .input(
      z.object({
        characterId: z.string(),
        permDeaths: z.number().int().min(0),
        reason: z.string().min(1, "Reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const character = await ctx.db.character.findUnique({
        where: { id: input.characterId },
      });

      if (!character) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      }

      const oldPermDeaths = character.permDeaths ?? 0;
      const updatedCharacter = await ctx.db.character.update({
        where: { id: input.characterId },
        data: {
          permDeaths: input.permDeaths,
        },
      });

      // Log admin action
      await ctx.db.adminActionLog.create({
        data: {
          actorId: ctx.session.user.id,
          targetCharacterId: input.characterId,
          action: "UPDATE_PERM_DEATHS",
          reason: input.reason,
          metadata: {
            oldPermDeaths,
            newPermDeaths: input.permDeaths,
            change: input.permDeaths - oldPermDeaths,
          },
        },
      });

      return updatedCharacter;
    }),

  // Ban user with duration options
  banUser: moderatorProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1, "Reason is required"),
        duration: z.enum(["1h", "6h", "12h", "24h", "3d", "7d", "30d", "permanent"]).optional(),
        until: z.date().optional(), // Custom date override
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

      let bannedUntil: Date | null = null;

      if (input.until) {
        bannedUntil = input.until;
      } else if (input.duration && input.duration !== "permanent") {
        const durationMap: Record<string, number> = {
          "1h": 1 * 60 * 60 * 1000,
          "6h": 6 * 60 * 60 * 1000,
          "12h": 12 * 60 * 60 * 1000,
          "24h": 24 * 60 * 60 * 1000,
          "3d": 3 * 24 * 60 * 60 * 1000,
          "7d": 7 * 24 * 60 * 60 * 1000,
          "30d": 30 * 24 * 60 * 60 * 1000,
        };
        bannedUntil = new Date(Date.now() + durationMap[input.duration]!);
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: input.id },
        data: {
          isBanned: true,
          bannedUntil,
          banReason: input.reason,
        },
      });

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetUserId: input.id,
        targetEntityType: "User",
        targetEntityId: input.id,
        action: "USER_BANNED",
        reason: input.reason,
        payloadJson: {
          duration: input.duration,
          bannedUntil: bannedUntil?.toISOString() ?? null,
        },
        ipAddress: getIpAddress(ctx.headers),
        userAgent: getUserAgent(ctx.headers),
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

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetUserId: input.id,
        targetEntityType: "User",
        targetEntityId: input.id,
        action: "USER_UNBANNED",
        reason: "User unbanned",
        payloadJson: {},
        ipAddress: getIpAddress(ctx.headers),
        userAgent: getUserAgent(ctx.headers),
      });

      return updatedUser;
    }),

  // Mute user with duration options
  muteUser: moderatorProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1, "Reason is required"),
        duration: z.enum(["15m", "30m", "1h", "6h", "12h", "24h", "3d", "7d", "permanent"]).optional(),
        until: z.date().optional(), // Custom date override
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

      let mutedUntil: Date | null = null;

      if (input.until) {
        mutedUntil = input.until;
      } else if (input.duration && input.duration !== "permanent") {
        const durationMap: Record<string, number> = {
          "15m": 15 * 60 * 1000,
          "30m": 30 * 60 * 1000,
          "1h": 1 * 60 * 60 * 1000,
          "6h": 6 * 60 * 60 * 1000,
          "12h": 12 * 60 * 60 * 1000,
          "24h": 24 * 60 * 60 * 1000,
          "3d": 3 * 24 * 60 * 60 * 1000,
          "7d": 7 * 24 * 60 * 60 * 1000,
        };
        mutedUntil = new Date(Date.now() + durationMap[input.duration]!);
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: input.id },
        data: {
          isMuted: true,
          mutedUntil,
          muteReason: input.reason,
        },
      });

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetUserId: input.id,
        targetEntityType: "User",
        targetEntityId: input.id,
        action: "USER_MUTED",
        reason: input.reason,
        payloadJson: {
          duration: input.duration,
          mutedUntil: mutedUntil?.toISOString() ?? null,
        },
        ipAddress: getIpAddress(ctx.headers),
        userAgent: getUserAgent(ctx.headers),
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

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetUserId: input.id,
        targetEntityType: "User",
        targetEntityId: input.id,
        action: "USER_UNMUTED",
        reason: "User unmuted",
        payloadJson: {},
        ipAddress: getIpAddress(ctx.headers),
        userAgent: getUserAgent(ctx.headers),
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

  // Get IP history for a user (ADMIN only)
  getIpHistory: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const ipHistory = await ctx.db.userIpHistory.findMany({
        where: {
          userId: input.userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: input.limit,
      });

      return ipHistory;
    }),

  // Set user role (ADMIN only) - replaces all roles
  setRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["PLAYER", "MODERATOR", "ADMIN", "CONTENT"]),
        reason: z.string().min(3, "Reason must be at least 3 characters").max(200, "Reason must be at most 200 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: { roles: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Delete all existing role assignments
      await ctx.db.userRoleAssignment.deleteMany({
        where: { userId: input.userId },
      });

      // Create new role assignment
      await ctx.db.userRoleAssignment.create({
        data: {
          userId: input.userId,
          role: input.role,
          assignedBy: ctx.session.user.id,
        },
      });

      // Update legacy role field
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetUserId: input.userId,
        targetEntityType: "User",
        targetEntityId: input.userId,
        action: "ROLE_SET",
        reason: input.reason,
        payloadJson: {
          oldRoles: user.roles.map((r) => r.role),
          newRole: input.role,
        },
        ipAddress: getIpAddress(ctx.headers),
        userAgent: getUserAgent(ctx.headers),
      });

      return { success: true };
    }),

  // Grant role to user (ADMIN only) - adds role without removing others
  grantRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["PLAYER", "MODERATOR", "ADMIN", "CONTENT"]),
        reason: z.string().min(3, "Reason must be at least 3 characters").max(200, "Reason must be at most 200 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: { roles: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if role already exists
      const hasRole = user.roles.some((r) => r.role === input.role);
      if (hasRole) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has this role",
        });
      }

      // Create new role assignment
      await ctx.db.userRoleAssignment.create({
        data: {
          userId: input.userId,
          role: input.role,
          assignedBy: ctx.session.user.id,
        },
      });

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetUserId: input.userId,
        targetEntityType: "User",
        targetEntityId: input.userId,
        action: "ROLE_GRANTED",
        reason: input.reason,
        payloadJson: {
          grantedRole: input.role,
          existingRoles: user.roles.map((r) => r.role),
        },
        ipAddress: getIpAddress(ctx.headers),
        userAgent: getUserAgent(ctx.headers),
      });

      return { success: true };
    }),

  // Revoke role from user (ADMIN only)
  revokeRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["PLAYER", "MODERATOR", "ADMIN", "CONTENT"]),
        reason: z.string().min(3, "Reason must be at least 3 characters").max(200, "Reason must be at most 200 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: { roles: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if role exists
      const roleAssignment = user.roles.find((r) => r.role === input.role);
      if (!roleAssignment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not have this role",
        });
      }

      // Delete role assignment
      await ctx.db.userRoleAssignment.delete({
        where: {
          userId_role: {
            userId: input.userId,
            role: input.role,
          },
        },
      });

      // Log audit event
      await logAuditEvent(ctx.db, {
        actorUserId: ctx.session.user.id,
        targetUserId: input.userId,
        targetEntityType: "User",
        targetEntityId: input.userId,
        action: "ROLE_REVOKED",
        reason: input.reason,
        payloadJson: {
          revokedRole: input.role,
          remainingRoles: user.roles.filter((r) => r.role !== input.role).map((r) => r.role),
        },
        ipAddress: getIpAddress(ctx.headers),
        userAgent: getUserAgent(ctx.headers),
      });

      return { success: true };
    }),

  // Update player level (ADMIN only)
  updatePlayerLevel: adminProcedure
    .input(
      z.object({
        playerId: z.string(),
        level: z.number().int().min(1),
        reason: z.string().min(1, "Reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { id: input.playerId },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      const oldLevel = player.level;
      const updatedPlayer = await ctx.db.player.update({
        where: { id: input.playerId },
        data: {
          level: input.level,
        },
      });

      // Log admin action
      await ctx.db.adminActionLog.create({
        data: {
          actorId: ctx.session.user.id,
          targetUserId: player.userId,
          action: "UPDATE_PLAYER_LEVEL",
          reason: input.reason,
          metadata: {
            oldLevel,
            newLevel: input.level,
            change: input.level - oldLevel,
          },
        },
      });

      return updatedPlayer;
    }),

  // Update player experience (ADMIN only)
  updatePlayerExperience: adminProcedure
    .input(
      z.object({
        playerId: z.string(),
        experience: z.number().int().min(0),
        reason: z.string().min(1, "Reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { id: input.playerId },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      const oldExperience = player.experience;
      const updatedPlayer = await ctx.db.player.update({
        where: { id: input.playerId },
        data: {
          experience: input.experience,
        },
      });

      // Log admin action
      await ctx.db.adminActionLog.create({
        data: {
          actorId: ctx.session.user.id,
          targetUserId: player.userId,
          action: "UPDATE_PLAYER_EXPERIENCE",
          reason: input.reason,
          metadata: {
            oldExperience,
            newExperience: input.experience,
            change: input.experience - oldExperience,
          },
        },
      });

      return updatedPlayer;
    }),

  // Update job level (ADMIN only)
  updateJobLevel: adminProcedure
    .input(
      z.object({
        userJobId: z.string(),
        level: z.number().int().min(1),
        xp: z.number().int().min(0).optional(),
        reason: z.string().min(1, "Reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userJob = await ctx.db.userJob.findUnique({
        where: { id: input.userJobId },
        include: { job: true },
      });

      if (!userJob) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      const oldLevel = userJob.level;
      const oldXp = userJob.xp;
      const updatedJob = await ctx.db.userJob.update({
        where: { id: input.userJobId },
        data: {
          level: input.level,
          ...(input.xp !== undefined && { xp: input.xp }),
        },
      });

      // Log admin action
      await ctx.db.adminActionLog.create({
        data: {
          actorId: ctx.session.user.id,
          targetUserId: userJob.playerId,
          action: "UPDATE_JOB_LEVEL",
          reason: input.reason,
          metadata: {
            jobId: userJob.jobId,
            jobName: userJob.job.name,
            oldLevel,
            newLevel: input.level,
            levelChange: input.level - oldLevel,
            ...(input.xp !== undefined && {
              oldXp,
              newXp: input.xp,
              xpChange: input.xp - oldXp,
            }),
          },
        },
      });

      return updatedJob;
    }),
});
