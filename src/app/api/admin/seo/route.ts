import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";

const TABLE = "seo_documents";
const VALID_ENTITY_TYPES = ["article", "substance", "glossary", "page"];

export async function GET(request: NextRequest) {
  const authenticated = await isAdminAuthenticated(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: [], total: 0, limit: 50, offset: 0 });
  }

  const url = request.nextUrl;
  const entityType = url.searchParams.get("entity_type");
  const slug = url.searchParams.get("slug");
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "50", 10),
    100
  );
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (entityType) query = query.eq("entity_type", entityType);
    if (slug) query = query.eq("slug", slug);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
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

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase nicht konfiguriert. SEO-Einträge können im Demo-Modus nicht gespeichert werden." },
      { status: 503 }
    );
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

  // Validate required fields
  if (
    !body.slug ||
    typeof body.slug !== "string" ||
    !(body.slug as string).trim()
  ) {
    return NextResponse.json(
      { error: "Pflichtfeld fehlt: slug" },
      { status: 400 }
    );
  }

  const entityType = (body.entity_type as string) || "article";
  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json(
      { error: "Ungültiger entity_type-Wert." },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    const row = {
      slug: (body.slug as string).trim(),
      entity_type: entityType,
      title: body.title ?? null,
      description: body.description ?? null,
      canonical_url: body.canonical_url ?? null,
      og_title: body.og_title ?? null,
      og_description: body.og_description ?? null,
      og_image_url: body.og_image_url ?? null,
      robots: (body.robots as string) || "index, follow",
      keywords: body.keywords ?? null,
      structured_data: body.structured_data ?? null,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: "slug,entity_type" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authenticated = await isAdminAuthenticated(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase nicht konfiguriert." },
      { status: 503 }
    );
  }

  const url = request.nextUrl;
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Pflichtfeld fehlt: id" },
      { status: 400 }
    );
  }

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
