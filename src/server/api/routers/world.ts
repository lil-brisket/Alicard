import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const worldRouter = createTRPCRouter({
  // Get active world with all tiles
  getActiveWorld: protectedProcedure.query(async ({ ctx }) => {
    // Get or create default world
    let world = await ctx.db.world.findUnique({
      where: { id: "default-world" },
      include: {
        tiles: {
          orderBy: [
            { y: "asc" },
            { x: "asc" },
          ],
        },
      },
    });

    // If world doesn't exist, create it (fallback - should be seeded)
    if (!world) {
      world = await ctx.db.world.create({
        data: {
          id: "default-world",
          name: "Alicard",
          width: 20,
          height: 20,
        },
        include: {
          tiles: true,
        },
      });
    }

    return world;
  }),
});
