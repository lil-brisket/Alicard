// Feature-based router organization
// economy/ - Economic systems (banking, market, etc.)
import { bankRouter } from "~/server/api/routers/economy/bank";

// character/ - Character progression and management
import { playerRouter } from "~/server/api/routers/character/player";
import { characterRouter } from "~/server/api/routers/character/character";
import { equipmentRouter } from "~/server/api/routers/character/equipment";
import { skillsRouter } from "~/server/api/routers/character/skills";

// world/ - World map and movement
import { worldRouter } from "~/server/api/routers/world/world";
import { mapRouter } from "~/server/api/routers/world/map";

// Other routers (to be organized later or kept at root)
import { postRouter } from "~/server/api/routers/post";
import { combatRouter } from "~/server/api/routers/combat";
import { hallOfTheDeadRouter } from "~/server/api/routers/hallOfTheDead";
import { jobsRouter } from "~/server/api/routers/jobs";
import { recipesRouter } from "~/server/api/routers/recipes";
import { gatheringRouter } from "~/server/api/routers/gathering";
import { profileRouter } from "~/server/api/routers/profile";
import { battleRouter } from "~/server/api/routers/battle";
import { usersRouter } from "~/server/api/routers/users";
import { leaderboardsRouter } from "~/server/api/routers/leaderboards";
import { adminRouter } from "~/server/api/routers/admin";
import { contentRouter } from "~/server/api/routers/content";
import { skillTrainingRouter } from "~/server/api/routers/skill-training";
import { settingsRouter } from "~/server/api/routers/settings";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 *
 * Router Discipline:
 * - Public routers (publicProcedure): leaderboards, profile viewing, hall of the dead
 * - Protected routers (protectedProcedure): bank, inventory, movement, combat, character progression
 * - Double-check that sensitive operations (bank transfers, movement, combat) are protected
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
  users: usersRouter,
  bank: bankRouter,
  leaderboards: leaderboardsRouter,
  world: worldRouter,
  admin: adminRouter,
  content: contentRouter,
  skillTraining: skillTrainingRouter,
  settings: settingsRouter,
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
