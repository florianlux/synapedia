import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeSubstancePayload, pickOnConflict } from "@/lib/substances/sanitize";
import { getAllowedColumns } from "@/lib/substances/sanitize-server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WikidataItem {
  qid: string;
  pubchem_cid: number;
  label: string;
  description: string;
}

interface PubChemItem {
  cid: number;
  synonyms: string[];
  molecular_formula?: string;
  molecular_weight?: number;
  isomeric_smiles?: string;
}

interface ImportResult {
  label: string;
  qid: string;
  status: "created" | "updated" | "skipped" | "failed";
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// POST /api/admin/import-substances
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated(request);
    if (!isAuth) {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    let body: {
      items: WikidataItem[];
      enrichments?: Record<number, PubChemItem>;
      dryRun?: boolean;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
    }

    const { items, enrichments = {}, dryRun = false } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Keine Items angegeben." }, { status: 400 });
    }

    if (items.length > 500) {
      return NextResponse.json({ error: "Max 500 Items pro Request." }, { status: 400 });
    }

    // Dry-run: validate and return what would happen
    if (dryRun) {
      const preview = items.map((item) => ({
        label: item.label,
        qid: item.qid,
        pubchem_cid: item.pubchem_cid,
        slug: slugify(item.label),
        synonymCount: enrichments[item.pubchem_cid]?.synonyms?.length ?? 0,
      }));
      return NextResponse.json({ dryRun: true, count: preview.length, preview });
    }

    const supabase = createAdminClient();
    const allowedColumns = await getAllowedColumns();
    const onConflictColumn = pickOnConflict(allowedColumns);

    const results: ImportResult[] = [];

    for (const item of items) {
      try {
        const slug = slugify(item.label);

        // Check existing by slug
        const { data: existing } = await supabase
          .from("substances")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (existing) {
          // Update wikidata_qid and pubchem_cid if missing
          await supabase
            .from("substances")
            .update({
              wikidata_qid: item.qid,
              pubchem_cid: item.pubchem_cid,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          results.push({ label: item.label, qid: item.qid, status: "updated" });
          continue;
        }

        // Build new substance row
        const enrichment = enrichments[item.pubchem_cid];
        const rawRow: Record<string, unknown> = {
          name: item.label,
          slug,
          canonical_name: item.label,
          summary: item.description || "",
          status: "draft",
          wikidata_qid: item.qid,
          pubchem_cid: item.pubchem_cid,
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
          external_ids: {
            wikidata: item.qid,
            pubchem: item.pubchem_cid,
            ...(enrichment?.molecular_formula ? { molecular_formula: enrichment.molecular_formula } : {}),
          },
          enrichment: {},
        };

        const sanitizedRow = sanitizeSubstancePayload(rawRow, allowedColumns);
        const effectiveConflict =
          onConflictColumn in sanitizedRow ? onConflictColumn : "name";

        const { data: upserted, error: upsertError } = await supabase
          .from("substances")
          .upsert(sanitizedRow, { onConflict: effectiveConflict })
          .select("id")
          .single();

        if (upsertError) {
          results.push({ label: item.label, qid: item.qid, status: "failed", error: upsertError.message });
          continue;
        }

        // Insert synonyms as aliases
        if (enrichment?.synonyms && enrichment.synonyms.length > 0 && upserted?.id) {
          const aliases = enrichment.synonyms.slice(0, 20).map((syn) => ({
            substance_id: upserted.id,
            alias: syn,
            alias_type: "synonym" as const,
            source: "pubchem",
          }));

          await supabase
            .from("substance_aliases")
            .upsert(aliases, { onConflict: "alias,substance_id" })
            .select("id");
        }

        results.push({ label: item.label, qid: item.qid, status: "created" });
      } catch (err) {
        results.push({
          label: item.label,
          qid: item.qid,
          status: "failed",
          error: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
      }
    }

    const summary = {
      total: items.length,
      created: results.filter((r) => r.status === "created").length,
      updated: results.filter((r) => r.status === "updated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
    };

    // Log import (best-effort)
    try {
      await supabase.from("import_logs").insert({
        admin_user: request.headers.get("x-admin-user") || "admin",
        source_type: "wikidata",
        source_detail: `Wikidata SPARQL + PubChem enrichment`,
        total_count: summary.total,
        created_count: summary.created,
        skipped_count: summary.skipped,
        error_count: summary.failed,
      });
    } catch {
      // non-critical
    }

    return NextResponse.json({ summary, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[import-substances] Unhandled error:", message);
    return NextResponse.json(
      { error: message, details: "Interner Serverfehler." },
      { status: 500 },
    );
  }
}
