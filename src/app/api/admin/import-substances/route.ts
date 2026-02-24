import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { runImport, type WikidataItem } from "@/lib/substances/import-engine";

// ---------------------------------------------------------------------------
// POST /api/admin/import-substances
// Accepts a batch of Wikidata items (kept small by the client, e.g. 5-10).
// Returns { runId, summary, items[] }.
// ---------------------------------------------------------------------------

/** Hard cap per request – the client should send small batches. */
const MAX_ITEMS_PER_REQUEST = 50;

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  try {
    const isAuth = await isAdminAuthenticated(request);
    if (!isAuth) {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }

    let body: {
      items: WikidataItem[];
      dryRun?: boolean;
      limit?: number;
      skipAi?: boolean;
      skipPubChem?: boolean;
      runId?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
    }

    const { items, dryRun = false, limit = 500, skipAi = false, skipPubChem = false, runId } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Keine Items angegeben." }, { status: 400 });
    }

    if (items.length > MAX_ITEMS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Max ${MAX_ITEMS_PER_REQUEST} Items pro Request. Nutze Client-seitiges Batching.` },
        { status: 400 },
      );
    }

    console.log(
      `[import-substances] Starting batch: ${items.length} items, dryRun=${dryRun}, skipAi=${skipAi}, skipPubChem=${skipPubChem}`,
    );

    const result = await runImport(items, {
      limit,
      dryRun,
      skipAi,
      skipPubChem,
      runId,
    });

    const elapsed = Date.now() - t0;
    console.log(
      `[import-substances] Batch done in ${elapsed}ms: ${result.summary.inserted} inserted, ${result.summary.updated} updated, ${result.summary.failed} failed`,
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    const elapsed = Date.now() - t0;
    console.error(`[import-substances] Unhandled error after ${elapsed}ms:`, message);
    return NextResponse.json(
      { error: message, details: "Interner Serverfehler." },
      { status: 500 },
    );
  }
}
