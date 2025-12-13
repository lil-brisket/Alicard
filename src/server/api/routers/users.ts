import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const usersRouter = createTRPCRouter({
  // Search users by username
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2, "Query must be at least 2 characters"),
      })
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          username: {
            contains: input.query,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          username: true,
        },
        take: 10,
        orderBy: {
          username: "asc",
        },
      });

      return users;
    }),
});
