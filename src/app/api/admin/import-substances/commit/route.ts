import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { wikidataAdapter } from "@/lib/substances/adapters/wikidata-adapter";
import { pubchemAdapter } from "@/lib/substances/adapters/pubchem-adapter";
import { mergeRawSources } from "@/lib/substances/adapters/normalize";
import { slugify } from "@/lib/substances/slugify";

interface CommitItem {
  name: string;
  wikidataQid?: string;
  pubchemCid?: number;
  tags?: string[];
  category?: string;
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase nicht konfiguriert. Kein Import möglich." },
      { status: 503 },
    );
  }

  let body: { items: CommitItem[]; overwrite?: boolean; skipPubChem?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { items, overwrite = false, skipPubChem = false } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "No items" }, { status: 400 });
  }
  if (items.length > 50) {
    return NextResponse.json(
      { ok: false, error: "Max 50 items per commit batch" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Create audit run record
  let runId: string | null = null;
  try {
    const { data: run } = await supabase
      .from("import_runs")
      .insert({
        triggered_by: "admin",
        source_config: {
          adapters: skipPubChem ? ["wikidata"] : ["wikidata", "pubchem"],
          overwrite,
        },
        dry_run: false,
        total_items: items.length,
        status: "running",
      })
      .select("id")
      .single();
    runId = run?.id ?? null;
  } catch {
    // Non-blocking: continue without audit log if table doesn't exist yet
  }

  const itemResults: Array<{
    name: string;
    slug: string;
    action: string;
    confidence_score: number;
    error?: string;
  }> = [];

  for (const item of items) {
    const slug = slugify(item.name);
    try {
      // Fetch from adapters
      const raws = await (async () => {
        const results = [];
        const wikiRaw = item.wikidataQid
          ? await wikidataAdapter.fetchById(item.wikidataQid)
          : await wikidataAdapter.search(item.name).then((r) => r[0] ?? null);
        if (wikiRaw) {
          results.push({
            ...wikiRaw,
            category: item.category,
            tags: [...(wikiRaw.tags ?? []), ...(item.tags ?? [])],
          });
        }

        if (!skipPubChem) {
          const pubRaw = item.pubchemCid
            ? await pubchemAdapter.fetchById(String(item.pubchemCid)).catch(() => null)
            : await pubchemAdapter
                .search(item.name)
                .then((r) => r[0] ?? null)
                .catch(() => null);
          if (pubRaw) results.push(pubRaw);
        }
        return results;
      })();

      const normalized = mergeRawSources(item.name, raws);

      // Check existing
      const { data: existing } = await supabase
        .from("substances")
        .select("id, slug")
        .eq("slug", slug)
        .maybeSingle();

      let action: "inserted" | "updated" | "skipped";
      const upsertData = {
        name: normalized.name,
        slug: normalized.slug,
        canonical_id: normalized.canonicalId,
        confidence_score: normalized.confidenceScore,
        verification_status: normalized.verificationStatus,
        sources_meta: normalized.sources,
        aliases_list: normalized.aliases,
        last_imported_at: normalized.lastImportedAt,
        import_run_id: runId,
        status: "draft",
        // Only set categories if not already set
        ...(item.category && !existing ? { categories: [item.category] } : {}),
      };

      if (!existing) {
        await supabase.from("substances").insert(upsertData);
        action = "inserted";
      } else if (overwrite) {
        await supabase.from("substances").update(upsertData).eq("id", existing.id);
        action = "updated";
      } else {
        action = "skipped";
      }

      itemResults.push({
        name: item.name,
        slug,
        action,
        confidence_score: normalized.confidenceScore,
      });

      // Write audit item (non-blocking)
      if (runId) {
        void Promise.resolve(
          supabase.from("import_run_items").insert({
            run_id: runId,
            substance_name: item.name,
            substance_slug: slug,
            canonical_id: normalized.canonicalId,
            action,
            confidence_score: normalized.confidenceScore,
            sources: normalized.sources,
          }),
        ).catch(() => {});
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      itemResults.push({ name: item.name, slug, action: "failed", confidence_score: 0, error });
      if (runId) {
        void Promise.resolve(
          supabase.from("import_run_items").insert({
            run_id: runId,
            substance_name: item.name,
            substance_slug: slug,
            action: "failed",
            error_message: error,
            confidence_score: 0,
          }),
        ).catch(() => {});
      }
    }
  }

  const summary = {
    total: itemResults.length,
    inserted: itemResults.filter((r) => r.action === "inserted").length,
    updated: itemResults.filter((r) => r.action === "updated").length,
    skipped: itemResults.filter((r) => r.action === "skipped").length,
    failed: itemResults.filter((r) => r.action === "failed").length,
  };

  // Update audit run status
  if (runId) {
    void Promise.resolve(
      supabase
        .from("import_runs")
        .update({
          inserted_count: summary.inserted,
          updated_count: summary.updated,
          skipped_count: summary.skipped,
          error_count: summary.failed,
          status: "done",
        })
        .eq("id", runId),
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true, summary, items: itemResults, runId });
}
