import { createTRPCRouter } from "~/server/api/trpc";
import { adminUsersRouter } from "./users";

export const adminRouter = createTRPCRouter({
  users: adminUsersRouter,
});
