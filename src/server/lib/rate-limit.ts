/**
 * Simple in-memory rate limiter for MVP.
 * Tracks action timestamps per user to prevent abuse.
 * 
 * For production, consider using Redis or a proper rate limiting library.
 */

type RateLimitConfig = {
  maxActions: number;
  windowMs: number;
};

const defaultConfig: RateLimitConfig = {
  maxActions: 30, // 30 actions
  windowMs: 60 * 1000, // per minute
};

// In-memory store: userId -> timestamp[]
const actionHistory = new Map<string, number[]>();

/**
 * Check if a user can perform an action based on rate limits.
 * Returns true if allowed, false if rate limited.
 */
export function checkRateLimit(
  userId: string,
  config: RateLimitConfig = defaultConfig
): boolean {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get user's action history
  const userActions = actionHistory.get(userId) ?? [];

  // Filter to only actions within the window
  const recentActions = userActions.filter((timestamp) => timestamp > windowStart);

  // Check if under limit
  if (recentActions.length >= config.maxActions) {
    return false;
  }

  // Add current action
  recentActions.push(now);
  actionHistory.set(userId, recentActions);

  // Cleanup old entries periodically (every 1000 checks)
  if (Math.random() < 0.001) {
    cleanupOldEntries(windowStart);
  }

  return true;
}

/**
 * Clean up old entries from the rate limit store.
 */
function cleanupOldEntries(windowStart: number): void {
  for (const [userId, actions] of actionHistory.entries()) {
    const recentActions = actions.filter((timestamp) => timestamp > windowStart);
    if (recentActions.length === 0) {
      actionHistory.delete(userId);
    } else {
      actionHistory.set(userId, recentActions);
    }
  }
}

/**
 * Get remaining actions for a user in the current window.
 */
export function getRemainingActions(
  userId: string,
  config: RateLimitConfig = defaultConfig
): number {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const userActions = actionHistory.get(userId) ?? [];
  const recentActions = userActions.filter((timestamp) => timestamp > windowStart);
  return Math.max(0, config.maxActions - recentActions.length);
}
