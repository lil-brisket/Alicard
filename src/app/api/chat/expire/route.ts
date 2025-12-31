import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { emitChatDeleted } from "~/server/lib/chat/socket";
import { env } from "~/env";

/**
 * API route to expire old chat messages (marks them as deleted)
 * This should be called by a cron job periodically (e.g., every hour)
 * 
 * Authentication: Requires CRON_API_KEY in Authorization header or X-API-Key header
 * Format: Authorization: Bearer <api-key> or X-API-Key: <api-key>
 */
export async function POST(request: Request) {
  // Verify API key authentication
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");
  const vercelCronHeader = request.headers.get("x-vercel-cron"); // Vercel's automatic cron header
  
  const providedKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : apiKeyHeader;

  // In production, require API key (unless from Vercel Cron)
  if (env.NODE_ENV === "production") {
    if (!env.CRON_API_KEY) {
      console.error("CRON_API_KEY not configured in production");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Allow Vercel Cron requests (they include x-vercel-cron header)
    // Still verify API key if provided for additional security
    const isVercelCron = vercelCronHeader === "1";
    
    if (!isVercelCron && (!providedKey || providedKey !== env.CRON_API_KEY)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
  } else {
    // In development, warn if no API key is provided but allow it
    if (!providedKey && env.CRON_API_KEY) {
      console.warn("⚠️  CRON_API_KEY is set but not provided in request. Consider adding it for testing.");
    }
  }
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
      return NextResponse.json({ 
        success: true, 
        expired: 0,
        message: "No messages to expire" 
      });
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
    const rooms = new Set(expiredMessages.map((m) => m.room));
    for (const room of rooms) {
      const roomMessageIds = expiredMessages
        .filter((m) => m.room === room)
        .map((m) => m.id);
      
      for (const messageId of roomMessageIds) {
        emitChatDeleted(room, messageId);
      }
    }

    return NextResponse.json({
      success: true,
      expired: result.count,
      message: `Expired ${result.count} message(s)`,
    });
  } catch (error) {
    console.error("Error expiring chat messages:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to expire messages" 
      },
      { status: 500 }
    );
  }
}

