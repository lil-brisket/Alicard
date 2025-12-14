import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";

/**
 * Check if user has moderator or admin role
 * Throws TRPCError if not authorized
 */
export async function requireModerator() {
  const session = await auth();
  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
  }

  if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Moderator or Admin role required",
    });
  }

  return user;
}

/**
 * Check if user has admin role
 * Throws TRPCError if not authorized
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
  }

  if (user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin role required",
    });
  }

  return user;
}

/**
 * Check if user has moderator or admin role (for Next.js pages)
 * Redirects to signin or forbidden page if not authorized
 */
export async function requireModeratorPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, username: true },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
    redirect("/forbidden");
  }

  return user;
}

/**
 * Check if user has admin role (for Next.js pages)
 * Redirects to signin or forbidden page if not authorized
 */
export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, username: true },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  if (user.role !== "ADMIN") {
    redirect("/forbidden");
  }

  return user;
}
