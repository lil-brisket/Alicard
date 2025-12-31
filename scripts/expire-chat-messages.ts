#!/usr/bin/env tsx
/**
 * Script to expire old chat messages
 * Can be run manually or via cron job
 * 
 * Usage:
 *   tsx scripts/expire-chat-messages.ts
 * 
 * Or with cron (every hour):
 *   0 * * * * cd /path/to/project && tsx scripts/expire-chat-messages.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env") });

const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const API_KEY = process.env.CRON_API_KEY;

async function expireMessages() {
  try {
    const url = `${API_URL}/api/chat/expire`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add API key if configured
    if (API_KEY) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`Failed to expire messages: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Success: ${result.message || `Expired ${result.expired} message(s)`}`);
    return result;
  } catch (error) {
    console.error("❌ Error expiring chat messages:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  expireMessages();
}

export { expireMessages };

