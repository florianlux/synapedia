import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { BulkImportRequestSchema, SubstanceDraftSchema, type SubstanceDraft } from "@/lib/substances/schema";
import { buildAllSources } from "@/lib/substances/connectors";
import { contentSafetyFilter } from "@/lib/substances/content-safety";
import { canonicalizeName, resolveSynonym, parseCsvTsv, deduplicateNames } from "@/lib/substances/canonicalize";
import {
  sanitizeSubstancePayload,
  sanitizeSourcePayload,
  sanitizeAliasPayload,
  sanitizeEnrichmentJobPayload,
  sanitizeImportLogPayload,
} from "@/lib/substances/sanitize";
import type { ImportSourceType } from "@/lib/substances/schema";
import type { DeduplicatedEntry } from "@/lib/substances/canonicalize";

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

/** Allowed values for import_logs.source_type CHECK constraint. */
const VALID_IMPORT_SOURCE_TYPES: ReadonlySet<string> = new Set([
  "seed_pack", "paste", "csv", "fetch",
]);

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

  const { names, options } = parsed.data;

  // Extract import metadata from request
  const rawImportSource = (body as Record<string, unknown>)?.importSource as string | undefined;
  const importSource: ImportSourceType =
    rawImportSource && VALID_IMPORT_SOURCE_TYPES.has(rawImportSource)
      ? (rawImportSource as ImportSourceType)
      : "paste";
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

    // Canonicalize + resolve synonyms + deduplicate
    const resolvedNames = processNames.map((n) => {
      const canonical = canonicalizeName(n);
      return resolveSynonym(canonical);
    });
    const deduplicated = deduplicateNames(resolvedNames);

    // Create admin Supabase client (uses SERVICE_ROLE_KEY, bypasses RLS)
    const supabase = createAdminClient();

    // Process in batches of BATCH_SIZE
    const results: BulkResultItem[] = [];
    for (let i = 0; i < deduplicated.length; i += BATCH_SIZE) {
      const batch = deduplicated.slice(i, i + BATCH_SIZE);
      const batchResults = await processBatch(
        supabase, batch, csvSynonyms, options, queueEnrichment,
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

  // Canonicalize + resolve synonyms + deduplicate
  const resolvedNames = processNames.map((n) => {
    const canonical = canonicalizeName(n);
    return resolveSynonym(canonical);
  });
  const deduplicated = deduplicateNames(resolvedNames);

  const results: {
    name: string;
    slug: string;
    status: "created" | "skipped" | "error";
    message?: string;
    id?: string;
  }[] = [];

  // Create Supabase server client ONCE, outside the loop.
  // Using the server client (createServerClient) instead of the browser client
  // prevents PostgREST errors in server-side API routes.
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Process each substance
  for (const entry of deduplicated) {
    const { canonicalName: name, slug } = entry;

    try {
      // Check if already exists by slug
      const { data: existing, error: existsError } = await supabase
        .from("substances")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existsError) {
        results.push({ name, slug, status: "error", message: existsError.message });
        continue;
      }

      if (existing) {
        results.push({ name, slug, status: "skipped", message: "Existiert bereits." });
        continue;
      }

      // Also check aliases for dedup
      const { data: aliasMatch, error: aliasCheckError } = await supabase
        .from("substance_aliases")
        .select("substance_id")
        .eq("alias", name.toLowerCase())
        .maybeSingle();

      if (aliasCheckError) {
        console.error(`[bulk] Alias check for ${name}:`, aliasCheckError.message);
        // Non-fatal: continue with insert even if alias check fails
      }

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

      // Insert the substance. Use plain insert (not upsert) because we
      // already verified the slug does not exist. This avoids PostgREST
      // "Could not find the … key" errors when the DB constraint name
      // does not match the onConflict parameter.
      const { data: inserted, error: insertError } = await supabase
        .from("substances")
        .insert(sanitizedRow)
        .select("id")
        .single();

      if (insertError) {
        // Handle unique-constraint race condition gracefully
        if (insertError.code === "23505") {
          results.push({ name, slug, status: "skipped", message: "Existiert bereits (concurrent)." });
        } else {
          results.push({ name, slug, status: "error", message: insertError.message });
        }
        continue;
      }

      const substanceId = upserted.id;

      // Store synonyms from CSV as aliases (non-blocking)
      const synonymsForThis = csvSynonyms[entry.originalName] ?? [];
      if (synonymsForThis.length > 0) {
        try {
          const aliases = synonymsForThis.map((syn) =>
            sanitizeAliasPayload({
              substance_id: substanceId,
              alias: syn,
              alias_type: "synonym" as const,
              source: "csv_import",
            }),
          );
          const { error: aliasError } = await supabase
            .from("substance_aliases")
            .insert(aliases);
          if (aliasError) {
            console.error(`[bulk] Aliases for ${name}:`, aliasError.message);
          }
        } catch (aliasErr) {
          console.error(`[bulk] Aliases for ${name}:`, aliasErr instanceof Error ? aliasErr.message : String(aliasErr));
        }
      }

      // Create source references (non-blocking)
      if (options.fetchSources) {
        try {
          const rawSources = buildAllSources(name, substanceId);
          const sources = rawSources.map((s) =>
            sanitizeSourcePayload(s as Record<string, unknown>),
          );
          const { error: sourceError } = await supabase
            .from("substance_sources")
            .insert(sources);

          if (sourceError) {
            console.error(`[bulk] Sources for ${name}:`, sourceError.message);
          }
        } catch (srcErr) {
          console.error(`[bulk] Sources for ${name}:`, srcErr instanceof Error ? srcErr.message : String(srcErr));
        }
      }

      // Queue enrichment job if requested (non-blocking)
      if (queueEnrichment) {
        try {
          const { error: jobError } = await supabase
            .from("enrichment_jobs")
            .insert(
              sanitizeEnrichmentJobPayload({
                substance_id: substanceId,
                phase: "pending",
                status: "queued",
              }),
            );
          if (jobError) {
            console.error(`[bulk] Enrichment job for ${name}:`, jobError.message);
          }
        } catch (jobErr) {
          console.error(`[bulk] Enrichment job for ${name}:`, jobErr instanceof Error ? jobErr.message : String(jobErr));
        }
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

  const summary = {
    total: deduplicated.length,
    created: results.filter((r) => r.status === "created").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
  };

  // Log the import (non-blocking)
  try {
    const { error: logError } = await supabase
      .from("import_logs")
      .insert(
        sanitizeImportLogPayload({
          admin_user: request.headers.get("x-admin-user") || "admin",
          source_type: importSource,
          source_detail: importDetail,
          total_count: summary.total,
          created_count: summary.created,
          skipped_count: summary.skipped,
          error_count: summary.errors,
        }),
      );
    if (logError) {
      console.error("[bulk] Import logging failed:", logError.message);
    }
  } catch (logErr) {
    console.error("[bulk] Import logging failed:", logErr);
  }

  return NextResponse.json({ summary, results });
}
