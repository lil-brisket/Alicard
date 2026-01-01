/**
 * Custom Next.js server with Socket.IO support
 * 
 * To use this server, update package.json scripts:
 * - "dev": "node server.js" (instead of "next dev")
 * - "start": "node server.js" (instead of "next start")
 * 
 * Or run: node server.js
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

// Set NODE_ENV=production for production builds
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: dev ? "*" : process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    // Handle room joins (for chat rooms: global, guild:<id>, party:<id>)
    socket.on("join", (room) => {
      if (typeof room === "string" && room.length > 0) {
        socket.join(room);
      }
    });

    // Handle room leaves
    socket.on("leave", (room) => {
      if (typeof room === "string" && room.length > 0) {
        socket.leave(room);
      }
    });

    socket.on("disconnect", () => {
      // User disconnected - rooms are automatically cleaned up
    });
  });

  // Store io instance globally for use in API routes
  // @ts-ignore - global.io is set for Socket.IO access
  global.io = io;

  // Optional: Enable in-process cron job for chat message expiration
  // Uncomment the following lines to enable (requires node-cron package)
  // if (process.env.ENABLE_CHAT_EXPIRE_CRON === "true") {
  //   const { startChatExpireCron } = await import("./src/server/lib/cron/chat-expire.js");
  //   startChatExpireCron(); // Runs every hour by default
  // }

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO ready on ws://${hostname}:${port}/api/socketio`);
    });
});

