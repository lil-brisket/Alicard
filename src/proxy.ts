import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function proxy(request: NextRequest) {
  // Track IP on successful auth routes
  if (request.nextUrl.pathname.startsWith("/api/auth/callback")) {
    const session = await auth();
    if (session?.user?.id) {
      const ipAddress = 
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        request.ip ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || null;

      // Track IP history (don't await to avoid blocking)
      db.userIpHistory
        .create({
          data: {
            userId: session.user.id,
            ipAddress,
            userAgent,
          },
        })
        .catch((err) => {
          console.error("Failed to track IP history:", err);
        });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/auth/:path*",
  ],
};
