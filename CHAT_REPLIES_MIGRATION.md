# Chat Replies Feature - Migration Required

## Changes Made

1. **Database Schema**: Added `parentMessageId` field to `ChatMessage` model for reply threading
2. **Text Size**: Increased text sizes throughout the chat
3. **Reactions**: Now only appear on hover (desktop) or press (mobile)
4. **Reply Functionality**: Users can now reply to messages

## Migration Required

You need to run a database migration to add the `parentMessageId` field:

```bash
node scripts/prisma-with-env.js migrate dev --name add_chat_replies
```

Or if that doesn't work:

```bash
npx prisma migrate dev --name add_chat_replies
```

Then regenerate Prisma Client:

```bash
node scripts/prisma-with-env.js generate
```

## Features

### 1. Larger Text
- Username: `text-base` → `text-lg` on desktop
- Message content: `text-base` → `text-lg` on desktop
- Timestamps: `text-xs` → `text-sm` on desktop

### 2. Reactions on Hover/Press
- Reactions are hidden by default
- Appear when hovering over a message (desktop)
- Appear when pressing/tapping a message (mobile)
- Reactions with counts > 0 are always visible

### 3. Reply Functionality
- Click "Reply" button on any message
- Reply indicator shows in input area
- Replies are nested under parent messages
- Replies have their own reactions
- Reply button appears on hover/press

## Usage

1. **Reply to a message**: Click the "Reply" button that appears when hovering/pressing a message
2. **Cancel reply**: Click the ✕ button in the reply indicator
3. **View replies**: Replies appear nested under their parent message with a left border
4. **React to replies**: Hover/press on a reply to see and add reactions

