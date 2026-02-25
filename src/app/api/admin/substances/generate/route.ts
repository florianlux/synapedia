import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GenerateSubstanceInputSchema, generateSubstance } from "@/lib/ai/generate-substance";
import { nameToSlug } from "@/lib/substances/connectors";
import { sanitizeSubstancePayload } from "@/lib/substances/sanitize";
import { contentSafetyFilter } from "@/lib/substances/content-safety";
import { STATIC_SUBSTANCES_COLUMNS } from "@/lib/substances/sanitize";

/**
 * POST /api/admin/substances/generate
 *
 * Accepts { name, category?, notes?, strictHR?, previewOnly? }.
 * Uses AI to generate a structured substance record, validates it,
 * applies content safety filtering, ensures a unique slug, and inserts
 * into public.substances via the admin (service role) client.
 *
 * Returns { ok: true, record } or { ok: false, error }.
 */
export async function POST(request: NextRequest) {
  try {
    /* ---- Auth ---- */
    const isAuth = await isAdminAuthenticated(request);
    if (!isAuth) {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    /* ---- Parse body ---- */
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Ungültiger Request-Body." }, { status: 400 });
    }

    /* ---- Validate input ---- */
    const parsed = GenerateSubstanceInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Validierungsfehler.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;

    /* ---- Check preview-only mode ---- */
    const previewOnly = (body as Record<string, unknown>)?.previewOnly === true;

    /* ---- Generate via AI ---- */
    let draft;
    try {
      draft = await generateSubstance(input);
    } catch (aiErr) {
      const message = aiErr instanceof Error ? aiErr.message : "AI-Generierung fehlgeschlagen.";
      console.error("[generate] AI error:", message);
      return NextResponse.json({ ok: false, error: message }, { status: 502 });
    }

    /* ---- Content safety filtering ---- */
    const summaryCheck = contentSafetyFilter(draft.summary);
    const mechanismCheck = contentSafetyFilter(draft.mechanism);
    if (summaryCheck.hasFlaggedContent) draft.summary = summaryCheck.clean;
    if (mechanismCheck.hasFlaggedContent) draft.mechanism = mechanismCheck.clean;

    /* ---- If preview, return without DB write ---- */
    if (previewOnly) {
      return NextResponse.json({ ok: true, preview: true, record: draft });
    }

    /* ---- Build slug with uniqueness guarantee ---- */
    const baseSlug = nameToSlug(input.name);
    const supabase = createAdminClient();

    let slug = baseSlug;
    let suffix = 1;
    let slugExists = true;
    while (slugExists) {
      const { data: existing } = await supabase
        .from("substances")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) {
        slugExists = false;
      } else {
        suffix++;
        slug = `${baseSlug}-${suffix}`;
      }
    }
    draft.slug = slug;

    /* ---- Build DB row ---- */
    const rawRow = {
      name: draft.name,
      slug: draft.slug,
      categories: input.category ? [input.category] : draft.categories,
      summary: draft.summary,
      mechanism: draft.mechanism,
      effects: draft.effects,
      risks: draft.risks,
      interactions: draft.interactions,
      dependence: draft.dependence,
      legality: draft.legality,
      citations: draft.citations,
      confidence: draft.confidence,
      status: "draft" as const,
      canonical_name: draft.name,
      tags: [],
      related_slugs: [],
      external_ids: {},
      enrichment: { source: "ai_generate", generated_at: new Date().toISOString() },
    };
    const sanitizedRow = sanitizeSubstancePayload(rawRow, STATIC_SUBSTANCES_COLUMNS);

    /* ---- Insert ---- */
    const { data: inserted, error: insertError } = await supabase
      .from("substances")
      .insert(sanitizedRow)
      .select("*")
      .single();

    if (insertError) {
      console.error("[generate] DB insert error:", insertError.message);
      return NextResponse.json(
        { ok: false, error: `Datenbank-Fehler: ${insertError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, record: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[generate] Unhandled error:", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
