import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { runImport, type WikidataItem } from "@/lib/substances/import-engine";

// ---------------------------------------------------------------------------
// POST /api/admin/import-substances
// Processes a BATCH of items (client splits into small batches to avoid 504).
// Returns { ok, results[] } with per-item status.
// ---------------------------------------------------------------------------

const MAX_BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  const batchStart = Date.now();

  try {
    const isAuth = await isAdminAuthenticated(request);
    if (!isAuth) {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert.", results: [] }, { status: 401 });
    }

    let body: {
      items: WikidataItem[];
      dryRun?: boolean;
      limit?: number;
      skipAi?: boolean;
      skipPubChem?: boolean;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Ungültiger Request-Body.", results: [] }, { status: 400 });
    }

    const { items, dryRun = false, skipAi = false, skipPubChem = false } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: "Keine Items angegeben.", results: [] }, { status: 400 });
    }

    if (items.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Max ${MAX_BATCH_SIZE} Items pro Batch.`, results: [] },
        { status: 400 },
      );
    }

    console.log(
      `[import-substances] Batch received: ${items.length} items, dryRun=${dryRun}, skipAi=${skipAi}, skipPubChem=${skipPubChem}`,
    );

    const result = await runImport(items, {
      limit: items.length,
      dryRun,
      skipAi,
      skipPubChem,
    });

    const elapsed = Date.now() - batchStart;
    console.log(
      `[import-substances] Batch done in ${elapsed}ms: ${result.summary.inserted} inserted, ${result.summary.updated} updated, ${result.summary.failed} failed`,
    );

    // Map to the structured per-item format expected by the client
    const results = result.items.map((item) => {
      let status: "inserted" | "updated" | "skipped" | "failed";
      if (item.db_status === "inserted" || item.db_status === "updated") {
        status = item.db_status;
      } else if (item.db_status === "skipped") {
        status = "skipped";
      } else {
        status = "failed";
      }

      return {
        qid: item.qid,
        label: item.label,
        slug: item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        status,
        reason: item.error || undefined,
        // Keep full detail for backward compat
        wikidata_status: item.wikidata_status,
        pubchem_status: item.pubchem_status,
        ai_status: item.ai_status,
        db_status: item.db_status,
        confidence_score: item.confidence_score,
      };
    });

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    const elapsed = Date.now() - batchStart;
    console.error(`[import-substances] Unhandled error after ${elapsed}ms:`, message);

    // User-friendly timeout warning
    if (elapsed > 8_000) {
      return NextResponse.json(
        {
          ok: false,
          error: "Batch hat zu lange gedauert. Bitte kleinere Batch-Größe wählen.",
          results: [],
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: false, error: message, results: [] },
      { status: 500 },
    );
  }
}
