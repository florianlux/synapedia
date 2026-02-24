import { NextRequest, NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    return NextResponse.json({ error: "Auth ist nicht konfiguriert." }, { status: 501 });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request." }, { status: 400 });
  }

  if (body.token !== adminToken) {
    return NextResponse.json({ error: "Ungültiges Token." }, { status: 401 });
  }

  await setAdminCookie(body.token);
  return NextResponse.json({ success: true });
}
