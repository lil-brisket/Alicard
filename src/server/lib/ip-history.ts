import { db } from "~/server/db";

/**
 * Get IP address from request headers
 */
export function getIpAddress(headers: Headers): string {
  // Check various headers for IP address (in order of preference)
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return "unknown";
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(headers: Headers): string | null {
  return headers.get("user-agent");
}

/**
 * Track IP history for a user
 * Only creates a new record if the IP or user agent has changed
 * or if the last record is older than 1 hour
 */
export async function trackIpHistory(
  userId: string,
  ipAddress: string,
  userAgent: string | null,
): Promise<void> {
  if (ipAddress === "unknown") {
    return;
  }

  // Check the most recent IP history record
  const lastRecord = await db.userIpHistory.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Only create a new record if:
  // 1. No previous record exists
  // 2. IP address changed
  // 3. User agent changed
  // 4. Last record is older than 1 hour
  const shouldCreate =
    !lastRecord ||
    lastRecord.ipAddress !== ipAddress ||
    lastRecord.userAgent !== userAgent ||
    lastRecord.createdAt < oneHourAgo;

  if (shouldCreate) {
    await db.userIpHistory.create({
      data: {
        userId,
        ipAddress,
        userAgent,
      },
    });
  }
}
