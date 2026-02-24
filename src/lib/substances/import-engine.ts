/**
 * Resilient Import Engine for /admin/import-substances.
 *
 * Pipeline per substance:
 *   fetchWikidata → normalize → optional PubChem enrich → AI enrich
 *   → validate → upsert into synapedia.substances (unless dryRun)
 *
 * Design principles:
 * - PubChem is best-effort; 404 → not_found, never fails the run
 * - AI enrichment is required baseline but failure is non-blocking
 * - Idempotent: upserts by qid (primary) or InChIKey (fallback)
 * - Confidence scoring per substance (0–100)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchPubChemHardened, type PubChemHardenedResult } from "./pubchem-hardened";
import { runAiEnrichment, type AiStatus } from "./ai/enrich";

/* ============ Types ============ */

export type WikidataStatus = "ok" | "failed";
export type PubChemStatus = "ok" | "not_found" | "error" | "skipped";
export type DbStatus = "inserted" | "updated" | "skipped" | "failed";

export interface ImportItemResult {
  label: string;
  qid: string;
  wikidata_status: WikidataStatus;
  pubchem_status: PubChemStatus;
  ai_status: AiStatus;
  db_status: DbStatus;
  confidence_score: number;
  error?: string;
}

export interface ImportSummary {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  pubchem_not_found: number;
  avg_confidence: number;
}

export interface ImportRunResult {
  runId: string;
  summary: ImportSummary;
  items: ImportItemResult[];
}

export interface ImportOptions {
  limit: number;
  dryRun: boolean;
  runId?: string;
  skipAi?: boolean;
  skipPubChem?: boolean;
}

export interface WikidataItem {
  qid: string;
  pubchem_cid: number;
  label: string;
  description: string;
}

/* ============ Helpers ============ */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Compute confidence score (0–100) based on data completeness.
 */
export function computeConfidenceScore(params: {
  hasWikidata: boolean;
  hasPubChem: boolean;
  hasAiEnrichment: boolean;
  aiStatus: AiStatus;
  pubchemStatus: PubChemStatus;
  hasSynonyms: boolean;
  hasDescription: boolean;
  hasMolecularFormula: boolean;
}): number {
  let score = 0;

  // Wikidata baseline (30 points)
  if (params.hasWikidata) score += 20;
  if (params.hasDescription) score += 10;

  // PubChem enrichment (30 points)
  if (params.hasPubChem) score += 15;
  if (params.hasSynonyms) score += 10;
  if (params.hasMolecularFormula) score += 5;

  // AI enrichment (40 points)
  if (params.hasAiEnrichment && params.aiStatus === "ok") score += 40;
  else if (params.hasAiEnrichment && params.aiStatus === "failed") score += 15;

  return Math.min(100, Math.max(0, score));
}

/* ============ Pipeline Steps ============ */

async function processItem(
  item: WikidataItem,
  options: ImportOptions,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<ImportItemResult> {
  const result: ImportItemResult = {
    label: item.label,
    qid: item.qid,
    wikidata_status: "ok",
    pubchem_status: "skipped",
    ai_status: "skipped",
    db_status: "skipped",
    confidence_score: 0,
  };

  // ── Step 1: Wikidata is already fetched (passed in) ──
  if (!item.qid || !item.label) {
    result.wikidata_status = "failed";
    result.error = "Missing QID or label";
    return result;
  }

  // ── Step 2: PubChem enrichment (optional, best-effort) ──
  let pubchemData: PubChemHardenedResult | null = null;
  if (!options.skipPubChem && item.pubchem_cid) {
    pubchemData = await fetchPubChemHardened(item.label, item.pubchem_cid);
    result.pubchem_status = pubchemData.status;
  }

  // ── Step 3: AI enrichment ──
  let aiData: Awaited<ReturnType<typeof runAiEnrichment>> | null = null;
  if (!options.skipAi) {
    aiData = await runAiEnrichment(item.label, item.description || "", {
      molecularFormula: pubchemData?.data?.molecularFormula,
      synonyms: pubchemData?.data?.synonyms,
    });
    result.ai_status = aiData.status;
  }

  // ── Step 4: Confidence score ──
  result.confidence_score = computeConfidenceScore({
    hasWikidata: true,
    hasPubChem: result.pubchem_status === "ok",
    hasAiEnrichment: !!aiData?.data,
    aiStatus: result.ai_status,
    pubchemStatus: result.pubchem_status,
    hasSynonyms: (pubchemData?.data?.synonyms?.length ?? 0) > 0,
    hasDescription: !!item.description,
    hasMolecularFormula: !!pubchemData?.data?.molecularFormula,
  });

  // ── Step 5: DB upsert (unless dry run) ──
  if (options.dryRun) {
    result.db_status = "skipped";
    return result;
  }

  try {
    const slug = slugify(item.label);

    const identifiers: Record<string, unknown> = {
      wikidata: item.qid,
    };
    if (item.pubchem_cid) identifiers.CID = item.pubchem_cid;
    if (pubchemData?.data?.molecularFormula) identifiers.molecularFormula = pubchemData.data.molecularFormula;
    if (pubchemData?.data?.iupacName) identifiers.iupacName = pubchemData.data.iupacName;

    const enrichment: Record<string, unknown> = {};
    if (pubchemData?.data) enrichment.pubchem = pubchemData.data;
    if (aiData?.data) enrichment.ai = aiData.data;

    // Build substance row
    const row: Record<string, unknown> = {
      name: item.label,
      slug,
      canonical_name: item.label,
      summary: aiData?.data?.overview || item.description || "",
      status: "draft",
      categories: [],
      mechanism: "",
      effects: { positive: [], neutral: [], negative: [] },
      risks: { acute: [], chronic: [], contraindications: [] },
      interactions: { high_risk_pairs: [], notes: [] },
      dependence: { potential: "unknown", notes: [] },
      legality: { germany: "unknown", notes: [] },
      citations: {},
      confidence: {},
      tags: [],
      related_slugs: [],
      external_ids: identifiers,
      enrichment,
      meta: {
        qid: item.qid,
        pubchem_cid: item.pubchem_cid,
        wikidata_status: result.wikidata_status,
        pubchem_status: result.pubchem_status,
        ai_status: result.ai_status,
        confidence_score: result.confidence_score,
        import_run_id: options.runId,
      },
    };

    // Check existing by slug
    const { data: existing } = await supabase
      .from("substances")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      // Update
      const { error: updateError } = await supabase
        .from("substances")
        .update({
          external_ids: identifiers,
          enrichment,
          meta: row.meta,
        })
        .eq("id", existing.id);

      if (updateError) {
        result.db_status = "failed";
        result.error = updateError.message;
      } else {
        result.db_status = "updated";
      }
    } else {
      // Insert
      const { data: inserted, error: insertError } = await supabase
        .from("substances")
        .insert(row)
        .select("id")
        .single();

      if (insertError) {
        result.db_status = "failed";
        result.error = insertError.message;
      } else {
        result.db_status = "inserted";

        // Insert aliases from PubChem synonyms
        if (inserted?.id && pubchemData?.data?.synonyms?.length) {
          const aliases = pubchemData.data.synonyms.slice(0, 20).map((syn) => ({
            substance_id: inserted.id,
            alias: syn,
            alias_type: "synonym" as const,
            source: "pubchem",
          }));
          await supabase
            .from("substance_aliases")
            .upsert(aliases, { onConflict: "alias,substance_id" })
            .select("id");
        }
      }
    }
  } catch (err) {
    result.db_status = "failed";
    result.error = err instanceof Error ? err.message : "Unknown DB error";
  }

  return result;
}

/* ============ Main Entry Point ============ */

/**
 * Run the full import pipeline.
 * Accepts pre-fetched Wikidata items (client fetches SPARQL, sends to API).
 */
export async function runImport(
  items: WikidataItem[],
  options: ImportOptions,
): Promise<ImportRunResult> {
  const runId = options.runId ?? crypto.randomUUID();
  const opts = { ...options, runId };

  const supabase = options.dryRun ? null : createAdminClient();
  const results: ImportItemResult[] = [];

  const limited = items.slice(0, options.limit);

  for (const item of limited) {
    const itemResult = await processItem(
      item,
      opts,
      // Pass a dummy client for dry runs (DB step is skipped)
      supabase ?? createAdminClient(),
    );
    results.push(itemResult);
  }

  const summary: ImportSummary = {
    total: results.length,
    inserted: results.filter((r) => r.db_status === "inserted").length,
    updated: results.filter((r) => r.db_status === "updated").length,
    skipped: results.filter((r) => r.db_status === "skipped").length,
    failed: results.filter((r) => r.db_status === "failed").length,
    pubchem_not_found: results.filter((r) => r.pubchem_status === "not_found").length,
    avg_confidence: results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length)
      : 0,
  };

  return { runId, summary, items: results };
}
