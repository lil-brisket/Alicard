# Chat Message Expiration Cron Job Setup

This document explains how to set up automatic expiration of chat messages after 4 hours.

## Overview

Chat messages are automatically marked for expiration 4 hours after creation. The expiration process marks messages as deleted (soft delete) so they no longer appear in chat lists.

## Authentication

The expiration endpoint requires API key authentication in production. Set the `CRON_API_KEY` environment variable:

```env
# Generate a secure API key (32+ characters recommended)
CRON_API_KEY="your-secure-api-key-here-minimum-32-characters"
```

Generate a secure API key:
```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Setup Options

### Option 1: External Cron Service (Recommended for Production)

Use an external cron service to call the API endpoint. This is more reliable than in-process cron jobs.

**🎯 Recommended by Deployment Platform:**

- **Vercel**: Use Vercel Cron (built-in, free tier: 1 cron job)
- **Railway/Render**: Use GitHub Actions or EasyCron
- **Self-hosted/VPS**: Use system cron or EasyCron
- **Any platform**: GitHub Actions (free, reliable, works everywhere)

#### Using Vercel Cron (⭐ Best if deployed on Vercel)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/chat/expire",
      "schedule": "0 * * * *"
    }
  ]
}
```

Add the API key to Vercel environment variables:
- Go to your Vercel project settings → Environment Variables
- Add `CRON_API_KEY` to environment variables (for Production, Preview, and Development)
- The cron job will automatically include the API key in requests via the `x-vercel-cron` header

**Note:** Vercel Cron automatically authenticates requests, but you should still set `CRON_API_KEY` for security. The endpoint will verify the API key in production.

#### Using GitHub Actions (⭐ Best for any deployment platform)

**Pros:**
- ✅ Free (unlimited for public repos, 2000 min/month for private)
- ✅ Works with any deployment platform
- ✅ Reliable (GitHub infrastructure)
- ✅ Easy to set up
- ✅ Can trigger manually for testing

**Cons:**
- ⚠️ Requires GitHub repository
- ⚠️ Slight delay (runs within 1-2 minutes of scheduled time)

Create `.github/workflows/expire-chat.yml`:

```yaml
name: Expire Chat Messages

on:
  schedule:
    - cron: '0 * * * *' # Every hour
  workflow_dispatch: # Allow manual trigger

jobs:
  expire:
    runs-on: ubuntu-latest
    steps:
      - name: Call Expire API
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/chat/expire" \
            -H "Authorization: Bearer ${{ secrets.CRON_API_KEY }}" \
            -H "Content-Type: application/json"
```

Add secrets to GitHub:
- `APP_URL`: Your application URL (e.g., `https://your-app.vercel.app`)
- `CRON_API_KEY`: Your API key

#### Using EasyCron (⭐ Best for self-hosted or any platform)

**Pros:**
- ✅ Free tier available (up to 2 cron jobs)
- ✅ Works with any URL
- ✅ Reliable and monitored
- ✅ Email notifications on failure
- ✅ Web dashboard

**Setup:**
1. Sign up at [EasyCron.com](https://www.easycron.com)
2. Create a new cron job:
   - **URL**: `https://your-app.com/api/chat/expire`
   - **Method**: POST
   - **Headers**: `Authorization: Bearer YOUR_API_KEY`
   - **Schedule**: `0 * * * *` (every hour)
3. Save and activate

#### Using System Cron (Linux/macOS - Self-hosted only)

Add to your crontab (`crontab -e`):

```bash
# Expire chat messages every hour
0 * * * * cd /path/to/project && tsx scripts/expire-chat-messages.ts
```

Or using curl:

```bash
# Expire chat messages every hour
0 * * * * curl -X POST https://your-app.com/api/chat/expire \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

#### Using Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger to "Daily" → "Repeat task every: 1 hour"
4. Action: "Start a program"
5. Program: `node` (or `tsx` if using the script)
6. Arguments: `scripts/expire-chat-messages.ts` (or use curl as above)

### Option 2: In-Process Cron (Development/Self-Hosted)

For self-hosted deployments, you can use an in-process cron job.

#### Installation

```bash
npm install node-cron @types/node-cron
```

#### Enable in server.js

Uncomment the cron setup in `server.js`:

```javascript
// Optional: Enable in-process cron job for chat message expiration
if (process.env.ENABLE_CHAT_EXPIRE_CRON === "true") {
  const { startChatExpireCron } = await import("./src/server/lib/cron/chat-expire.js");
  startChatExpireCron(); // Runs every hour by default
}
```

#### Environment Variable

```env
ENABLE_CHAT_EXPIRE_CRON=true
```

**Note:** In-process cron jobs are less reliable than external services because:
- They stop if the Node.js process crashes
- They don't run during deployments
- They require the server to be running continuously

### Option 3: Manual Script

Run the expiration manually using the provided script:

```bash
# Using npm script
npm run expire:chat

# Or directly
tsx scripts/expire-chat-messages.ts
```

## Testing

Test the expiration endpoint manually:

```bash
# With API key
curl -X POST http://localhost:3000/api/chat/expire \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Response:
# {"success":true,"expired":5,"message":"Expired 5 message(s)"}
```

## Monitoring

The endpoint returns:
- `success`: Boolean indicating if the operation succeeded
- `expired`: Number of messages expired
- `message`: Human-readable message

Monitor your cron job to ensure it's running successfully. Set up alerts if the endpoint returns errors.

## Quick Recommendation Guide

**Choose based on your deployment:**

| Deployment Platform | Recommended Service | Why |
|-------------------|-------------------|-----|
| **Vercel** | Vercel Cron | Built-in, free, automatic |
| **Railway/Render** | GitHub Actions | Free, reliable, works everywhere |
| **Self-hosted/VPS** | System Cron | Direct, no external dependency |
| **Any platform** | GitHub Actions | Free, reliable, easy setup |
| **Need monitoring** | EasyCron | Free tier, email alerts |

**My Top 3 Recommendations:**

1. **Vercel Cron** - If you're on Vercel (easiest, built-in)
2. **GitHub Actions** - If you use GitHub (free, reliable, works everywhere)
3. **EasyCron** - If you want a managed service with monitoring (free tier available)

## Troubleshooting

### "Unauthorized" Error

- Ensure `CRON_API_KEY` is set in your environment
- Verify the API key in the request matches the environment variable
- Check that the header format is correct: `Authorization: Bearer <key>` or `X-API-Key: <key>`

### Messages Not Expiring

- Verify the cron job is running (check logs)
- Check that messages have `expiresAt` set (should be 4 hours after creation)
- Verify the database connection is working
- Check server logs for errors

### Development Mode

In development, the API key is optional. You'll see a warning if `CRON_API_KEY` is set but not provided, but the request will still succeed.

## Security Notes

1. **Never commit `CRON_API_KEY` to version control**
2. **Use a strong, random API key (32+ characters)**
3. **Rotate the API key periodically**
4. **Restrict access to the endpoint** (e.g., IP whitelist if using external cron)
5. **Monitor for unauthorized access attempts**

