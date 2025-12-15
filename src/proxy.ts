import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Proxy logic can be added here as needed
  // For now, this allows all requests to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (all API routes - auth, trpc, etc.)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
