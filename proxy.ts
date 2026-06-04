import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/admin-auth";
import { isLocalDevelopment } from "@/lib/dev-access";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isAdminRoute = pathname.startsWith("/api/waitlist/admin");
  const isDevToolRoute =
    pathname.startsWith("/try") ||
    pathname.startsWith("/api/tryon") ||
    pathname.startsWith("/api/extract");

  if (isDevToolRoute && isLocalDevelopment()) {
    return NextResponse.next();
  }

  const isAuthenticated =
    (isAdminRoute || isDevToolRoute) && (await isValidAdminSessionToken(adminToken));

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const loginUrl = new URL("/admin", request.url);
  loginUrl.searchParams.set("next", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/try/:path*",
    "/api/tryon/:path*",
    "/api/extract/:path*",
    "/api/waitlist/admin/:path*",
  ],
};
