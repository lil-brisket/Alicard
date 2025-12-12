import { postRouter } from "~/server/api/routers/post";
import { playerRouter } from "~/server/api/routers/player";
import { mapRouter } from "~/server/api/routers/map";
import { combatRouter } from "~/server/api/routers/combat";
import { characterRouter } from "~/server/api/routers/character";
import { hallOfTheDeadRouter } from "~/server/api/routers/hallOfTheDead";
import { jobsRouter } from "~/server/api/routers/jobs";
import { recipesRouter } from "~/server/api/routers/recipes";
import { gatheringRouter } from "~/server/api/routers/gathering";
import { equipmentRouter } from "~/server/api/routers/equipment";
import { skillsRouter } from "~/server/api/routers/skills";
import { profileRouter } from "~/server/api/routers/profile";
import { battleRouter } from "~/server/api/routers/battle";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  player: playerRouter,
  map: mapRouter,
  combat: combatRouter,
  character: characterRouter,
  hallOfTheDead: hallOfTheDeadRouter,
  jobs: jobsRouter,
  recipes: recipesRouter,
  gathering: gatheringRouter,
  equipment: equipmentRouter,
  skills: skillsRouter,
  profile: profileRouter,
  battle: battleRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
