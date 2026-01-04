import { createTRPCRouter, contentProcedure } from "~/server/api/trpc";
import { contentItemsRouter } from "./items";
import { contentMonstersRouter } from "./monsters";
import { contentQuestsRouter } from "./quests";
import { contentMapsRouter } from "./maps";
import { contentSkillsRouter } from "./skills";
import { contentPlayerAssignmentRouter } from "./player-assignment";
import { contentGatheringNodesRouter } from "./gathering-nodes";
import { contentGatheringNodeYieldsRouter } from "./gathering-node-yields";
import { contentRecipesRouter } from "./recipes";
import { getContentPermissions } from "~/server/lib/admin-auth";

export const contentRouter = createTRPCRouter({
  items: contentItemsRouter,
  monsters: contentMonstersRouter,
  quests: contentQuestsRouter,
  maps: contentMapsRouter,
  skills: contentSkillsRouter,
  playerAssignment: contentPlayerAssignmentRouter,
  gatheringNodes: contentGatheringNodesRouter,
  gatheringNodeYields: contentGatheringNodeYieldsRouter,
  recipes: contentRecipesRouter,
  
  // Get current user's content permissions
  permissions: createTRPCRouter({
    get: contentProcedure.query(async ({ ctx }) => {
      const permissions = await getContentPermissions(ctx.session.user.id);
      return {
        permissions: Array.from(permissions),
      };
    }),
  }),
});
