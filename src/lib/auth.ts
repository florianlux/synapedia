import { cookies } from "next/headers";

const ADMIN_COOKIE = "synapedia_admin_token";

/**
 * Validates the admin token from cookie or Authorization header.
 * Returns true if ADMIN_TOKEN is not set (demo mode) or token matches.
 */
export async function isAdminAuthenticated(request?: Request): Promise<boolean> {
  const adminToken = process.env.ADMIN_TOKEN;

  // If no ADMIN_TOKEN is set, auth is disabled (demo mode)
  if (!adminToken) return true;

  // Check Authorization header if request is provided
  if (request) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader === `Bearer ${adminToken}`) return true;
  }

  // Check cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(ADMIN_COOKIE)?.value;
  return cookieToken === adminToken;
}

/**
 * Sets the admin token cookie.
 */
export async function setAdminCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Removes the admin token cookie.
 */
export async function clearAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
