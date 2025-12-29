/**
 * Socket.IO API Route
 * 
 * Note: Next.js App Router doesn't support WebSocket connections directly in route handlers.
 * For Socket.IO to work properly, you need to either:
 * 1. Use a custom Next.js server (server.js)
 * 2. Use a separate Socket.IO server
 * 3. Use Socket.IO's polling transport (works but less efficient)
 * 
 * This route handler serves as a placeholder. The actual Socket.IO server
 * should be initialized in a custom server file (server.js) or separate process.
 * 
 * For now, clients will connect directly to the Socket.IO server endpoint.
 */
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return new Response(
    JSON.stringify({ 
      status: "ok", 
      message: "Socket.IO server should be initialized via custom server or separate process",
      endpoint: "/api/socket",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

