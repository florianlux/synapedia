import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "synapedia_admin_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Never intercept API routes — let them pass through unchanged
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 1. Trailing-slash normalization → canonical /admin and /admin/login
  if (pathname !== "/" && pathname.endsWith("/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "");
    return NextResponse.redirect(url, 308);
  }

  // 2. Admin-enabled gate
  const adminEnabled =
    process.env.ADMIN_ENABLED ??
    process.env.NEXT_PUBLIC_ADMIN_ENABLED ??
    "true"; // default to enabled for backward compatibility
  if (adminEnabled !== "true") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 3. /admin/login is always reachable (no auth redirect)
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // 4. Auth check for all other /admin routes
  const adminToken = process.env.ADMIN_TOKEN;

  // No ADMIN_TOKEN configured → demo mode, allow access
  if (!adminToken) {
    return NextResponse.next();
  }

  const cookieToken = request.cookies.get(ADMIN_COOKIE)?.value;
  if (cookieToken === adminToken) {
    return NextResponse.next();
  }

  // Not authenticated → redirect to login (no loop: /admin/login is excluded above)
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
