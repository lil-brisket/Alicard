import { TRPCError } from "@trpc/server";
import type { UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

/**
 * Get all effective roles for a user (combines legacy role field + multi-role assignments)
 */
export async function getUserEffectiveRoles(
  db: PrismaClient,
  userId: string
): Promise<Set<UserRole>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      roles: {
        select: { role: true },
      },
    },
  });

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
  }

  const allRoles = new Set<UserRole>([
    user.role,
    ...(user.roles?.map((r) => r.role) ?? []),
  ]);

  return allRoles;
}

/**
 * Require a specific role - throws if user doesn't have it
 */
export async function requireRole(
  db: PrismaClient,
  userId: string,
  role: UserRole
): Promise<Set<UserRole>> {
  const roles = await getUserEffectiveRoles(db, userId);
  if (!roles.has(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${role} role required`,
    });
  }
  return roles;
}

/**
 * Require any of the specified roles - throws if user doesn't have at least one
 */
export async function requireAnyRole(
  db: PrismaClient,
  userId: string,
  allowedRoles: UserRole[]
): Promise<Set<UserRole>> {
  const roles = await getUserEffectiveRoles(db, userId);
  const hasAny = allowedRoles.some((role) => roles.has(role));
  if (!hasAny) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `One of the following roles required: ${allowedRoles.join(", ")}`,
    });
  }
  return roles;
}

