import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_COOKIE = "synapedia_admin_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Never intercept API routes — let them pass through unchanged
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 1. Trailing-slash normalization
  if (pathname !== "/" && pathname.endsWith("/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "");
    return NextResponse.redirect(url, 308);
  }

  // 2. Supabase session refresh for all routes
  const response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 4. /admin/login and /admin/access are always reachable (no auth redirect)
  if (pathname === "/admin/login" || pathname === "/admin/access") {
    return NextResponse.next();
  }

  // 3. Admin route handling
  if (pathname.startsWith("/admin")) {
    // Admin-enabled gate
    const adminEnabled =
      process.env.ADMIN_ENABLED ??
      process.env.NEXT_PUBLIC_ADMIN_ENABLED ??
      "true";
    if (adminEnabled !== "true") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // /admin/login is always reachable
    if (pathname === "/admin/login") {
      return response;
    }

    // Auth check for all other /admin routes
    const adminToken = process.env.ADMIN_TOKEN;

    // No ADMIN_TOKEN configured → demo mode, allow access
    if (!adminToken) {
      return response;
    }

    const cookieToken = request.cookies.get(ADMIN_COOKIE)?.value;
    if (cookieToken === adminToken) {
      return response;
    }

    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
