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

function hasForbiddenKeys(obj: Record<string, unknown>): string | null {
  for (const key of FORBIDDEN_KEYS) {
    if (key in obj) return key;
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAdminAuthenticated(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request." }, { status: 400 });
  }

  const forbidden = hasForbiddenKeys(body);
  if (forbidden) {
    return NextResponse.json(
      { error: `Verbotenes Feld: "${forbidden}". Keine geheimen Werte speichern.` },
      { status: 400 }
    );
  }

  // Remove id/created_at from update payload
  delete body.id;
  delete body.created_at;
  delete body.updated_at;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAdminAuthenticated(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from(TABLE).delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
