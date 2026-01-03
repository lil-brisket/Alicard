import type { PrismaClient, Prisma } from "@prisma/client";

export interface AuditEventData {
  actorUserId?: string | null;
  actorCharacterId?: string | null;
  targetUserId?: string | null;
  targetEntityType?: string | null; // e.g. "User", "EnemyTemplate", "DropTable"
  targetEntityId?: string | null;
  action: string; // e.g. "USER_BANNED", "ROLE_GRANTED", "CONTENT_UPDATED"
  reason?: string | null;
  payloadJson?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Log an audit event to the database
 * Works within a transaction or standalone
 */
export async function logAuditEvent(
  tx: PrismaClient | Prisma.TransactionClient,
  data: AuditEventData
): Promise<void> {
  await tx.auditEvent.create({
    data: {
      actorUserId: data.actorUserId,
      actorCharacterId: data.actorCharacterId,
      targetUserId: data.targetUserId,
      targetEntityType: data.targetEntityType,
      targetEntityId: data.targetEntityId,
      action: data.action,
      reason: data.reason ?? null,
      payloadJson: data.payloadJson ?? {},
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    },
  });
}

/**
 * Extract IP address from headers
 */
export function getIpAddress(headers: Headers): string | null {
  // Check various headers for IP (in order of preference)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return null;
}

/**
 * Extract user agent from headers
 */
export function getUserAgent(headers: Headers): string | null {
  return headers.get("user-agent");
}

