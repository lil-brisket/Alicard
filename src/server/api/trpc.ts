/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { trackIpHistory, getIpAddress, getUserAgent } from "~/server/lib/ip-history";
import { ensurePlayerExists } from "~/server/lib/ensure-player";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();

  return {
    db,
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    // Ensure db is available
    if (!ctx.db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database client is not available",
      });
    }
    
    // Track IP history (non-blocking)
    const ipAddress = getIpAddress(ctx.headers);
    const userAgent = getUserAgent(ctx.headers);
    trackIpHistory(ctx.session.user.id, ipAddress, userAgent).catch((error) => {
      // Silently fail - IP history tracking shouldn't break the request
      console.error("Failed to track IP history:", error);
    });
    
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
        db: ctx.db,
        headers: ctx.headers,
      },
    });
  });

/**
 * Moderator procedure (MODERATOR or ADMIN role required)
 *
 * Requires user to be authenticated and have MODERATOR or ADMIN role.
 */
export const moderatorProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (!ctx.db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database client is not available",
      });
    }

    // Fetch user from database to check role
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
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

    // Track IP history (non-blocking)
    const ipAddress = getIpAddress(ctx.headers);
    const userAgent = getUserAgent(ctx.headers);
    trackIpHistory(ctx.session.user.id, ipAddress, userAgent).catch((error) => {
      // Silently fail - IP history tracking shouldn't break the request
      console.error("Failed to track IP history:", error);
    });

    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
        db: ctx.db,
        headers: ctx.headers,
        userRole: user.role,
      },
    });
  });

/**
 * Admin procedure (ADMIN role required)
 *
 * Requires user to be authenticated and have ADMIN role.
 */
export const adminProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (!ctx.db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database client is not available",
      });
    }

    // Fetch user from database to check role
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
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

    // Track IP history (non-blocking)
    const ipAddress = getIpAddress(ctx.headers);
    const userAgent = getUserAgent(ctx.headers);
    trackIpHistory(ctx.session.user.id, ipAddress, userAgent).catch((error) => {
      // Silently fail - IP history tracking shouldn't break the request
      console.error("Failed to track IP history:", error);
    });

    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
        db: ctx.db,
        headers: ctx.headers,
        userRole: user.role,
      },
    });
  });

/**
 * Content procedure (ADMIN or CONTENT role required)
 *
 * Requires user to be authenticated and have ADMIN or CONTENT role.
 */
export const contentProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (!ctx.db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database client is not available",
      });
    }

    // Fetch user from database to check role (including multi-role assignments)
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { 
        id: true, 
        role: true,
        roles: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    // Check both single role field and multi-role assignments
    const userRoles = [
      user.role,
      ...(user.roles?.map((r) => r.role) ?? []),
    ];

    if (!userRoles.includes("ADMIN") && !userRoles.includes("CONTENT")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin or Content role required",
      });
    }

    // Track IP history (non-blocking)
    const ipAddress = getIpAddress(ctx.headers);
    const userAgent = getUserAgent(ctx.headers);
    trackIpHistory(ctx.session.user.id, ipAddress, userAgent).catch((error) => {
      // Silently fail - IP history tracking shouldn't break the request
      console.error("Failed to track IP history:", error);
    });

    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
        db: ctx.db,
        headers: ctx.headers,
        userRole: user.role,
      },
    });
  });

/**
 * Player procedure (authenticated user with Player record)
 *
 * Requires user to be authenticated and ensures a Player record exists.
 * If Player doesn't exist, creates one from the user's Character.
 * This is the procedure to use for game-related operations (battle, bank, etc.)
 */
export const playerProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    // Ensure db is available
    if (!ctx.db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database client is not available",
      });
    }
    
    // Track IP history (non-blocking)
    const ipAddress = getIpAddress(ctx.headers);
    const userAgent = getUserAgent(ctx.headers);
    trackIpHistory(ctx.session.user.id, ipAddress, userAgent).catch((error) => {
      // Silently fail - IP history tracking shouldn't break the request
      console.error("Failed to track IP history:", error);
    });

    // Ensure Player exists (creates from Character if needed)
    const player = await ensurePlayerExists(ctx.session.user.id);
    
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
        db: ctx.db,
        headers: ctx.headers,
        player, // Add player to context
      },
    });
  });
