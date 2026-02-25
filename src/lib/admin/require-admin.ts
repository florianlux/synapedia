import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "synapedia_admin_token";

/**
 * Throws a 401 NextResponse if the caller is not an authenticated admin.
 *
 * Behaviour:
 * - If ADMIN_TOKEN env var is empty / undefined → demo mode, always allow.
 * - Otherwise require the token via:
 *     1. Authorization: Bearer <token>  header, OR
 *     2. synapedia_admin_token cookie.
 */
export async function assertAdmin(req: Request): Promise<void> {
  const adminToken = process.env.ADMIN_TOKEN;

  // Demo mode – no token configured → allow all requests
  if (!adminToken) return;

  // 1. Check Authorization header
  const authHeader = req.headers.get("Authorization");
  if (authHeader === `Bearer ${adminToken}`) return;

  // 2. Check cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(ADMIN_COOKIE)?.value;
  if (cookieToken === adminToken) return;

  // Not authorised
  throw NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
}
