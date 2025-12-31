import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const notificationsRouter = createTRPCRouter({
  /**
   * List unread notifications for the current user
   */
  listUnread: protectedProcedure.query(async ({ ctx }) => {
    const notifications = await ctx.db.notification.findMany({
      where: {
        userId: ctx.session.user.id,
        readAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to 50 most recent
    });

    return notifications;
  }),

  /**
   * Mark a notification as read
   */
  markRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the notification belongs to the current user
      const notification = await ctx.db.notification.findUnique({
        where: { id: input.notificationId },
      });

      if (!notification) {
        throw new Error("Notification not found");
      }

      if (notification.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized");
      }

      // Mark as read
      await ctx.db.notification.update({
        where: { id: input.notificationId },
        data: { readAt: new Date() },
      });

      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.updateMany({
      where: {
        userId: ctx.session.user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { success: true };
  }),
});

