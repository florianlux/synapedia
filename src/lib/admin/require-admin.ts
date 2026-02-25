const ADMIN_COOKIE = "synapedia_admin_token";

/**
 * Extracts the admin token from a Request.
 * Checks Authorization header first, then the cookie.
 */
export function getAdminTokenFromRequest(req: Request): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // 2. Cookie: synapedia_admin_token=<token>
  const cookieHeader = req.headers.get("Cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  if (match) {
    return match.split("=")[1] ?? null;
  }

  return null;
}

/**
 * Returns true if the request carries a valid admin token,
 * or if ADMIN_TOKEN is unset (demo mode).
 */
export function isAdminRequest(req: Request): boolean {
  const serverToken = process.env.ADMIN_TOKEN;

  // Demo mode — no token configured, everything is accessible
  if (!serverToken) return true;

  const provided = getAdminTokenFromRequest(req);
  return provided === serverToken;
}

/**
 * Throws a 401 Response if the request is not authenticated.
 * In demo mode (ADMIN_TOKEN unset) this is a no-op.
 */
export function assertAdmin(req: Request): void {
  if (!isAdminRequest(req)) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
