# Global Chat System Setup Guide

## Step 1: Run Database Migration

First, you need to create and apply the database migration for the chat system:

```bash
npm run db:generate
```

This will:
- Create a new migration file for the `ChatMessage` and `ChatReaction` models
- Apply the migration to your database
- Generate the updated Prisma Client

**Note:** If you encounter any issues, make sure your database is running and your `DATABASE_URL` in `.env` is correct.

## Step 2: Start the Custom Server

The chat system requires a custom Next.js server to support Socket.IO WebSocket connections.

### Option A: Using npm scripts (Recommended)

The `package.json` has been updated with new scripts:

```bash
# For development
npm run dev

# For production
npm run start
```

These now use the custom `server.js` file that includes Socket.IO support.

### Option B: Run directly

You can also run the server directly:

```bash
node server.js
```

### What the custom server does:

- Starts Next.js with Socket.IO support
- Initializes Socket.IO on `/api/socket` endpoint
- Automatically joins all users to the "global" room
- Handles WebSocket connections for real-time chat

## Step 3: Verify Everything Works

1. Start the server: `npm run dev`
2. Navigate to: `http://localhost:3000/chat`
3. You should see:
   - "Live" status indicator (green dot)
   - Chat interface with message input
   - Real-time message updates

## Troubleshooting

### Migration Issues

If the migration fails:
- Check that your database is running
- Verify `DATABASE_URL` in `.env` is correct
- Try: `npx prisma migrate dev --name add_global_chat_system`

### Socket.IO Connection Issues

If you see "Connecting..." (red dot):
- Make sure you're using the custom server (`npm run dev`, not `npm run dev:next`)
- Check browser console for WebSocket errors
- Verify the server is running on port 3000

### TypeScript Errors

If you see TypeScript errors:
- Run: `npm run postinstall` to regenerate Prisma Client
- Or: `npx prisma generate`

## Development vs Production

- **Development**: Uses `npm run dev` (custom server with Socket.IO)
- **Production**: Uses `npm run start` (custom server with Socket.IO)
- **Fallback**: Use `npm run dev:next` or `npm run start:next` if you need the standard Next.js server (chat won't work)

## Features

✅ Real-time messaging via Socket.IO  
✅ HTML message support (sanitized server-side)  
✅ Emoji reactions (👍 😂 🔥 ❤️)  
✅ Message persistence in database  
✅ Public read, authenticated write  
✅ 2000 character limit  
✅ Connection status indicator  

