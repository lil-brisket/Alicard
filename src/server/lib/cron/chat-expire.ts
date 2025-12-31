/**
 * In-process cron job for expiring chat messages
 * 
 * This uses node-cron to run the expiration task within the Node.js process.
 * 
 * Usage: Import and call startChatExpireCron() in server.js or a startup file
 * 
 * Note: For production, consider using external cron services (Vercel Cron,
 * GitHub Actions, etc.) instead of in-process cron jobs for better reliability.
 */

import type { Server as SocketIOServer } from "socket.io";
import { db } from "~/server/db";
import { emitChatDeleted } from "~/server/lib/chat/socket";

/**
 * Expire old chat messages (marks them as deleted)
 * This is the same logic as the API route but can be called directly
 */
export async function expireChatMessages(): Promise<{
  success: boolean;
  expired: number;
  error?: string;
}> {
  try {
    const now = new Date();

    // Find all messages that have expired but not yet been deleted
    const expiredMessages = await db.chatMessage.findMany({
      where: {
        expiresAt: {
          lt: now, // expiresAt < now
        },
        deletedAt: null, // Not yet deleted
      },
      select: {
        id: true,
        room: true,
      },
    });

    if (expiredMessages.length === 0) {
      return {
        success: true,
        expired: 0,
      };
    }

    // Mark messages as deleted
    const result = await db.chatMessage.updateMany({
      where: {
        id: {
          in: expiredMessages.map((m) => m.id),
        },
      },
      data: {
        deletedAt: now,
      },
    });

    // Emit deletion events to rooms (optional - for real-time removal)
    const io = getSocketIO();
    if (io) {
      const rooms = new Set(expiredMessages.map((m) => m.room));
      for (const room of rooms) {
        const roomMessageIds = expiredMessages
          .filter((m) => m.room === room)
          .map((m) => m.id);

        for (const messageId of roomMessageIds) {
          emitChatDeleted(room, messageId);
        }
      }
    }

    return {
      success: true,
      expired: result.count,
    };
  } catch (error) {
    console.error("Error expiring chat messages:", error);
    return {
      success: false,
      expired: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get Socket.IO instance (same as in socket.ts)
 */
function getSocketIO(): SocketIOServer | null {
  if (typeof global !== "undefined" && (global as { io?: SocketIOServer }).io) {
    return (global as { io: SocketIOServer }).io;
  }
  return null;
}

/**
 * Start the cron job for expiring chat messages
 * Runs every hour by default
 * 
 * @param cronExpression - Cron expression (default: "0 * * * *" = every hour)
 */
export function startChatExpireCron(cronExpression: string = "0 * * * *"): void {
  // Dynamic import to avoid loading node-cron if not needed
  import("node-cron")
    .then((cron) => {
      const schedule = cron.default.schedule(cronExpression, async () => {
        console.log(`[Cron] Running chat message expiration at ${new Date().toISOString()}`);
        const result = await expireChatMessages();
        if (result.success) {
          console.log(`[Cron] Expired ${result.expired} chat message(s)`);
        } else {
          console.error(`[Cron] Failed to expire messages: ${result.error}`);
        }
      }, {
        scheduled: true,
        timezone: "UTC",
      });
      console.log(`[Cron] Chat message expiration scheduled: ${cronExpression}`);
      return schedule;
    })
    .catch((error) => {
      console.error("[Cron] Failed to load node-cron:", error);
      console.warn("[Cron] Install node-cron to enable in-process cron jobs: npm install node-cron @types/node-cron");
    });
}

