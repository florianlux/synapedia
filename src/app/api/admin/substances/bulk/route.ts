import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { BulkImportRequestSchema, SubstanceDraftSchema, type SubstanceDraft } from "@/lib/substances/schema";
import { buildAllSources } from "@/lib/substances/connectors";
import { contentSafetyFilter } from "@/lib/substances/content-safety";
import { canonicalizeName, resolveSynonym, parseCsvTsv, deduplicateNames } from "@/lib/substances/canonicalize";
import { sanitizeSubstancePayload, pickOnConflict } from "@/lib/substances/sanitize";
import { getAllowedColumns } from "@/lib/substances/sanitize-server";
import type { ImportSourceType } from "@/lib/substances/schema";
import type { DeduplicatedEntry } from "@/lib/substances/canonicalize";

/** Create admin Supabase client (uses SERVICE_ROLE_KEY, bypasses RLS) */
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** Batch size for processing substances */
const BATCH_SIZE = 25;

type BulkResultStatus = "created" | "updated" | "skipped" | "failed";

interface BulkResultItem {
  name: string;
  slug: string;
  status: BulkResultStatus;
  error?: string;
  id?: string;
}

/**
 * POST /api/admin/substances/bulk
 * Accepts a list of substance names, creates draft entries with source references.
 * Uses SUPABASE_SERVICE_ROLE_KEY (server only) — browser never writes directly.
 * Processes in batches; a single failure never aborts the whole import.
 */
export async function POST(request: NextRequest) {
  try {
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

    // Extract import metadata from request
    const importSource: ImportSourceType = (
      (body as Record<string, unknown>)?.importSource as ImportSourceType
    ) || "paste";
    const importDetail = ((body as Record<string, unknown>)?.importDetail as string) || "";
    const queueEnrichment = ((body as Record<string, unknown>)?.queueEnrichment as boolean) ?? false;
    const csvContent = ((body as Record<string, unknown>)?.csvContent as string) || "";

    // Handle CSV mode: parse CSV and extract names + synonyms
    let processNames = names;
    let csvSynonyms: Record<string, string[]> = {};
    if (importSource === "csv" && csvContent) {
      const entries = parseCsvTsv(csvContent);
      processNames = entries.map((e) => e.name);
      csvSynonyms = {};
      for (const entry of entries) {
        if (entry.synonyms.length > 0) {
          csvSynonyms[entry.name] = entry.synonyms;
        }
      }
    }

    // Canonicalize + resolve synonyms + deduplicate
    const resolvedNames = processNames.map((n) => {
      const canonical = canonicalizeName(n);
      return resolveSynonym(canonical);
    });
    const deduplicated = deduplicateNames(resolvedNames);

    // Create admin Supabase client (uses SERVICE_ROLE_KEY, bypasses RLS)
    const supabase = createAdminClient();

    // Resolve allowed DB columns and conflict target once for all batches
    const allowedColumns = await getAllowedColumns();
    const onConflictColumn = pickOnConflict(allowedColumns);

    // Process in batches of BATCH_SIZE
    const results: BulkResultItem[] = [];
    for (let i = 0; i < deduplicated.length; i += BATCH_SIZE) {
      const batch = deduplicated.slice(i, i + BATCH_SIZE);
      const batchResults = await processBatch(
        supabase, batch, csvSynonyms, options, queueEnrichment,
        allowedColumns, onConflictColumn,
      );
      results.push(...batchResults);
    }

    const summary = {
      total: deduplicated.length,
      created: results.filter((r) => r.status === "created").length,
      updated: results.filter((r) => r.status === "updated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
    };

    // Log the import (best-effort, don't fail the response)
    try {
      await supabase
        .from("import_logs")
        .insert({
          admin_user: request.headers.get("x-admin-user") || "admin",
          source_type: importSource,
          source_detail: importDetail,
          total_count: summary.total,
          created_count: summary.created,
          skipped_count: summary.skipped,
          error_count: summary.failed,
        });
    } catch (logErr) {
      console.error("[bulk] Import logging failed:", logErr);
    }

    return NextResponse.json({ summary, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[bulk] Unhandled error:", message);
    return NextResponse.json(
      { error: message, details: "Interner Serverfehler im Bulk-Import." },
      { status: 500 },
    );
  }
}

/**
 * Process a batch of deduplicated substance entries.
 * Each entry is handled independently — one failure does not abort the batch.
 */
async function processBatch(
  supabase: ReturnType<typeof createAdminClient>,
  batch: DeduplicatedEntry[],
  csvSynonyms: Record<string, string[]>,
  options: { fetchSources: boolean; generateDraft: boolean; queueRedditScan: boolean },
  queueEnrichment: boolean,
  allowedColumns: ReadonlySet<string>,
  onConflictColumn: string,
): Promise<BulkResultItem[]> {
  const results: BulkResultItem[] = [];

  for (const entry of batch) {
    const { canonicalName: name, slug } = entry;

    try {
      // Check if already exists by slug or canonical_name
      const { data: existingBySlug } = await supabase
        .from("substances")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      const { data: existingByCanonical } = !existingBySlug
        ? await supabase
            .from("substances")
            .select("id")
            .eq("canonical_name", name)
            .maybeSingle()
        : { data: existingBySlug };

      const existing = existingBySlug || existingByCanonical;

      // Also check aliases for dedup
      const { data: aliasMatch } = await supabase
        .from("substance_aliases")
        .select("substance_id")
        .eq("alias", name.toLowerCase())
        .maybeSingle();

      if (aliasMatch) {
        results.push({ name, slug, status: "skipped", error: "Alias existiert bereits." });
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

      // Safety check — filter each field independently
      const summarySafety = contentSafetyFilter(validated.summary);
      const mechanismSafety = contentSafetyFilter(validated.mechanism);
      if (summarySafety.hasFlaggedContent) {
        validated.summary = summarySafety.clean;
      }
      if (mechanismSafety.hasFlaggedContent) {
        validated.mechanism = mechanismSafety.clean;
      }

      // Build row and sanitize (unknown keys → meta jsonb)
      const rawRow = {
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
        status: "draft" as const,
        canonical_name: name,
        tags: [],
        related_slugs: [],
        external_ids: {},
        enrichment: {},
      };
      const sanitizedRow = sanitizeSubstancePayload(rawRow, allowedColumns);

      // Ensure the onConflict column is present in the sanitized row
      const effectiveConflict =
        onConflictColumn in sanitizedRow ? onConflictColumn : "name";

      // Determine status: update existing or create new
      const isUpdate = !!existing;

      // Upsert with onConflict on slug to handle duplicates
      const { data: upserted, error: upsertError } = await supabase
        .from("substances")
        .upsert(sanitizedRow, { onConflict: effectiveConflict })
        .select("id")
        .single();

      if (upsertError) {
        results.push({ name, slug, status: "failed", error: upsertError.message });
        continue;
      }

      const substanceId = upserted.id;

      // Store synonyms from CSV as aliases
      const synonymsForThis = csvSynonyms[entry.originalName] ?? [];
      if (synonymsForThis.length > 0) {
        const aliases = synonymsForThis.map((syn) => ({
          substance_id: substanceId,
          alias: syn,
          alias_type: "synonym" as const,
          source: "csv_import",
        }));
        await supabase
          .from("substance_aliases")
          .insert(aliases);
      }

      // Create source references
      if (options.fetchSources) {
        const sources = buildAllSources(name, substanceId);
        const { error: sourceError } = await supabase
          .from("substance_sources")
          .insert(sources);

        if (sourceError) {
          console.error(`[bulk] Sources for ${name}:`, sourceError.message);
        }
      }

      // Queue enrichment job if requested
      if (queueEnrichment) {
        await supabase
          .from("enrichment_jobs")
          .insert({
            substance_id: substanceId,
            phase: "pending",
            status: "queued",
          });
      }

      results.push({
        name,
        slug,
        status: isUpdate ? "updated" : "created",
        id: substanceId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      results.push({ name, slug, status: "failed", error: message });
    }
  }

  return results;
}
