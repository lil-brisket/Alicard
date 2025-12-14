import { createTRPCRouter } from "~/server/api/trpc";
import { contentItemsRouter } from "./items";
import { contentMonstersRouter } from "./monsters";
import { contentQuestsRouter } from "./quests";
import { contentMapsRouter } from "./maps";

export const contentRouter = createTRPCRouter({
  items: contentItemsRouter,
  monsters: contentMonstersRouter,
  quests: contentQuestsRouter,
  maps: contentMapsRouter,
});
