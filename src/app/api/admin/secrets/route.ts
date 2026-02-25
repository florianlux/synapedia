import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const TABLE = "secrets_register";
const FORBIDDEN_KEYS = [
  "secret_value",
  "value",
  "token",
  "password_raw",
  "secret",
  "api_key_value",
];
const REQUIRED_FIELDS = ["env", "project", "name", "kind", "storage_location"];
const VALID_ENVS = ["local", "staging", "production"];
const VALID_KINDS = [
  "token",
  "password",
  "email",
  "apikey",
  "oauth",
  "other",
];

function hasForbiddenKeys(obj: Record<string, unknown>): string | null {
  for (const key of FORBIDDEN_KEYS) {
    if (key in obj) return key;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const authenticated = await isAdminAuthenticated(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const url = request.nextUrl;
  const envFilter = url.searchParams.get("env");
  const projectFilter = url.searchParams.get("project");
  const kindFilter = url.searchParams.get("kind");
  const q = url.searchParams.get("q");
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "50", 10),
    50
  );
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (envFilter) query = query.eq("env", envFilter);
    if (projectFilter) query = query.eq("project", projectFilter);
    if (kindFilter) query = query.eq("kind", kindFilter);
    if (q) query = query.or(`name.ilike.%${q}%,project.ilike.%${q}%`);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], total: count ?? 0, limit, offset });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authenticated = await isAdminAuthenticated(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request." },
      { status: 400 }
    );
  }

  // Reject forbidden keys
  const forbidden = hasForbiddenKeys(body);
  if (forbidden) {
    return NextResponse.json(
      { error: `Verbotenes Feld: "${forbidden}". Keine geheimen Werte speichern.` },
      { status: 400 }
    );
  }

  // Validate required fields
  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || typeof body[field] !== "string" || !(body[field] as string).trim()) {
      return NextResponse.json(
        { error: `Pflichtfeld fehlt: ${field}` },
        { status: 400 }
      );
    }
  }

  if (!VALID_ENVS.includes(body.env as string)) {
    return NextResponse.json({ error: "Ungültiger env-Wert." }, { status: 400 });
  }
  if (!VALID_KINDS.includes(body.kind as string)) {
    return NextResponse.json({ error: "Ungültiger kind-Wert." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from(TABLE).insert(body).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
