import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { BulkImportRequestSchema, SubstanceDraftSchema, type SubstanceDraft } from "@/lib/substances/schema";
import { nameToSlug, buildAllSources } from "@/lib/substances/connectors";
import { contentSafetyFilter } from "@/lib/substances/content-safety";

/**
 * POST /api/admin/substances/bulk
 * Accepts a list of substance names, creates draft entries with source references.
 */
export async function POST(request: NextRequest) {
  const isAuth = await isAdminAuthenticated(request);
  if (!isAuth) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const parsed = BulkImportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierungsfehler.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { names, options } = parsed.data;

  // Deduplicate and normalize
  const seen = new Set<string>();
  const uniqueNames: string[] = [];
  for (const name of names) {
    const slug = nameToSlug(name.trim());
    if (!seen.has(slug) && name.trim().length > 0) {
      seen.add(slug);
      uniqueNames.push(name.trim());
    }
  }

  const results: {
    name: string;
    slug: string;
    status: "created" | "skipped" | "error";
    message?: string;
    id?: string;
  }[] = [];

  // Process each substance
  for (const name of uniqueNames) {
    const slug = nameToSlug(name);

    try {
      // Dynamic import to avoid issues when Supabase is not configured
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // Check if already exists
      const { data: existing } = await supabase
        .schema("synapedia")
        .from("substances")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) {
        results.push({ name, slug, status: "skipped", message: "Existiert bereits." });
        continue;
      }

      // Build draft
      const draft: SubstanceDraft = {
        name,
        slug,
        categories: [],
        summary: "",
        mechanism: "",
        effects: { positive: [], neutral: [], negative: [] },
        risks: { acute: [], chronic: [], contraindications: [] },
        interactions: { high_risk_pairs: [], notes: [] },
        dependence: { potential: "unknown", notes: [] },
        legality: { germany: "unknown", notes: [] },
        citations: {},
        confidence: {
          summary: 0,
          mechanism: 0,
          effects: 0,
          risks: 0,
          interactions: 0,
          dependence: 0,
          legality: 0,
        },
      };

      // Validate draft
      const validated = SubstanceDraftSchema.parse(draft);

      // Safety check
      const safetyResult = contentSafetyFilter(validated.summary + " " + validated.mechanism);
      if (safetyResult.hasFlaggedContent) {
        validated.summary = contentSafetyFilter(validated.summary).clean;
        validated.mechanism = contentSafetyFilter(validated.mechanism).clean;
      }

      // Insert substance
      const { data: inserted, error: insertError } = await supabase
        .schema("synapedia")
        .from("substances")
        .insert({
          name: validated.name,
          slug: validated.slug,
          categories: validated.categories,
          summary: validated.summary,
          mechanism: validated.mechanism,
          effects: validated.effects,
          risks: validated.risks,
          interactions: validated.interactions,
          dependence: validated.dependence,
          legality: validated.legality,
          citations: validated.citations,
          confidence: validated.confidence,
          status: "draft",
        })
        .select("id")
        .single();

      if (insertError) {
        results.push({ name, slug, status: "error", message: insertError.message });
        continue;
      }

      const substanceId = inserted.id;

      // Create source references
      if (options.fetchSources) {
        const sources = buildAllSources(name, substanceId);
        const { error: sourceError } = await supabase
          .schema("synapedia")
          .from("substance_sources")
          .insert(sources);

        if (sourceError) {
          console.error(`[bulk] Sources for ${name}:`, sourceError.message);
        }
      }

      results.push({ name, slug, status: "created", id: substanceId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      results.push({ name, slug, status: "error", message });
    }
  }

  const summary = {
    total: uniqueNames.length,
    created: results.filter((r) => r.status === "created").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
  };

  return NextResponse.json({ summary, results });
}
