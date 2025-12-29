import type { Server as SocketIOServer } from "socket.io";

/**
 * Get the Socket.IO server instance
 * The server is initialized in server.js (custom Next.js server)
 */
export function getSocketIO(): SocketIOServer | null {
  // Access the global io instance set in server.js
  if (typeof global !== "undefined" && (global as { io?: SocketIOServer }).io) {
    return (global as { io: SocketIOServer }).io;
  }
  return null;
}

/**
 * Emit a new chat message to all clients in a room
 */
export function emitChatMessage(room: string, message: unknown): void {
  const io = getSocketIO();
  if (io) {
    io.to(room).emit("chat:new", message);
  }
}

/**
 * Emit reaction updates to all clients in a room
 */
export function emitChatReactions(room: string, data: { messageId: string; reactions: unknown[] }): void {
  const io = getSocketIO();
  if (io) {
    io.to(room).emit("chat:reactions", data);
  }
}

