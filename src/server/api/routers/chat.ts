import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { sanitizeChatHtml } from "~/server/lib/chat/sanitize";
import { emitChatMessage, emitChatReactions } from "~/server/lib/chat/socket";

const MAX_MESSAGE_LENGTH = 2000;
const DEFAULT_ROOM = "global";

export const chatRouter = createTRPCRouter({
  /**
   * List chat messages with cursor pagination (newest first)
   * Public procedure - anyone can read messages
   */
  list: publicProcedure
    .input(
      z.object({
        cursor: z.string().cuid().optional(),
        limit: z.number().min(1).max(50).default(50),
        room: z.string().default(DEFAULT_ROOM),
      }),
    )
    .query(async ({ ctx, input }) => {
      const messages = await ctx.db.chatMessage.findMany({
        where: {
          room: input.room,
          parentMessageId: null, // Only get top-level messages
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              image: true,
            },
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  image: true,
                },
              },
              reactions: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (messages.length > input.limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      // Group reactions by emoji
      const messagesWithReactions = messages.map((message) => {
        const reactionGroups = message.reactions.reduce(
          (acc, reaction) => {
            if (!acc[reaction.emoji]) {
              acc[reaction.emoji] = {
                emoji: reaction.emoji,
                count: 0,
                users: [] as Array<{ id: string; username: string | null }>,
              };
            }
            acc[reaction.emoji]!.count++;
            acc[reaction.emoji]!.users.push({
              id: reaction.user.id,
              username: reaction.user.username,
            });
            return acc;
          },
          {} as Record<
            string,
            {
              emoji: string;
              count: number;
              users: Array<{ id: string; username: string | null }>;
            }
          >,
        );

        // Process replies
        const processedReplies = message.replies.map((reply) => {
          const replyReactionGroups = reply.reactions.reduce(
            (acc, reaction) => {
              if (!acc[reaction.emoji]) {
                acc[reaction.emoji] = {
                  emoji: reaction.emoji,
                  count: 0,
                  users: [] as Array<{ id: string; username: string | null }>,
                };
              }
              acc[reaction.emoji]!.count++;
              acc[reaction.emoji]!.users.push({
                id: reaction.user.id,
                username: reaction.user.username,
              });
              return acc;
            },
            {} as Record<
              string,
              {
                emoji: string;
                count: number;
                users: Array<{ id: string; username: string | null }>;
              }
            >,
          );

          return {
            id: reply.id,
            userId: reply.userId,
            user: reply.user,
            room: reply.room,
            content: reply.content,
            createdAt: reply.createdAt,
            reactions: Object.values(replyReactionGroups),
          };
        });

        return {
          id: message.id,
          userId: message.userId,
          user: message.user,
          room: message.room,
          content: message.content,
          createdAt: message.createdAt,
          parentMessageId: message.parentMessageId,
          reactions: Object.values(reactionGroups),
          replies: processedReplies,
        };
      });

      return {
        messages: messagesWithReactions.reverse(), // Reverse to show oldest first in UI
        nextCursor,
      };
    }),

  /**
   * Send a chat message
   * Protected procedure - only authenticated users can send
   */
  send: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
        room: z.string().default(DEFAULT_ROOM),
        parentMessageId: z.string().cuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // If replying, verify parent message exists
      if (input.parentMessageId) {
        const parentMessage = await ctx.db.chatMessage.findUnique({
          where: { id: input.parentMessageId },
        });

        if (!parentMessage) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent message not found",
          });
        }
      }

      // Sanitize HTML content
      const sanitizedContent = sanitizeChatHtml(input.content);

      // Create message
      const message = await ctx.db.chatMessage.create({
        data: {
          userId: ctx.session.user.id,
          room: input.room,
          content: sanitizedContent,
          parentMessageId: input.parentMessageId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              image: true,
            },
          },
          reactions: true,
        },
      });

      // Emit socket event to all clients in the room
      const messageData = {
        id: message.id,
        userId: message.userId,
        user: message.user,
        room: message.room,
        content: message.content,
        createdAt: message.createdAt,
        parentMessageId: message.parentMessageId,
        reactions: [],
        replies: [],
      };
      emitChatMessage(input.room, messageData);

      return messageData;
    }),

  /**
   * Toggle emoji reaction on a message
   * Protected procedure - only authenticated users can react
   */
  toggleReaction: protectedProcedure
    .input(
      z.object({
        messageId: z.string().cuid(),
        emoji: z.string().min(1).max(10), // Reasonable emoji length
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if message exists
      const message = await ctx.db.chatMessage.findUnique({
        where: { id: input.messageId },
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      // Check if reaction already exists
      const existingReaction = await ctx.db.chatReaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId: input.messageId,
            userId: ctx.session.user.id,
            emoji: input.emoji,
          },
        },
      });

      if (existingReaction) {
        // Remove reaction
        await ctx.db.chatReaction.delete({
          where: {
            id: existingReaction.id,
          },
        });
      } else {
        // Add reaction
        await ctx.db.chatReaction.create({
          data: {
            messageId: input.messageId,
            userId: ctx.session.user.id,
            emoji: input.emoji,
          },
        });
      }

      // Get updated reactions for this message
      const reactions = await ctx.db.chatReaction.findMany({
        where: {
          messageId: input.messageId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Group reactions by emoji
      const reactionGroups = reactions.reduce(
        (acc, reaction) => {
          if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = {
              emoji: reaction.emoji,
              count: 0,
              users: [] as Array<{ id: string; username: string | null }>,
            };
          }
          acc[reaction.emoji]!.count++;
          acc[reaction.emoji]!.users.push({
            id: reaction.user.id,
            username: reaction.user.username,
          });
          return acc;
        },
        {} as Record<
          string,
          {
            emoji: string;
            count: number;
            users: Array<{ id: string; username: string | null }>;
          }
        >,
      );

      const reactionData = {
        messageId: input.messageId,
        reactions: Object.values(reactionGroups),
      };

      // Emit reaction update to all clients in the room
      emitChatReactions(message.room, reactionData);

      return reactionData;
    }),
});

