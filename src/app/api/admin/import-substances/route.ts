import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { runImport, type WikidataItem } from "@/lib/substances/import-engine";

// ---------------------------------------------------------------------------
// POST /api/admin/import-substances
// Calls the Resilient Import Engine. Returns { runId, summary, items[] }.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
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
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
    }

    const { items, dryRun = false, limit = 500, skipAi = false, skipPubChem = false } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Keine Items angegeben." }, { status: 400 });
    }

    if (items.length > 500) {
      return NextResponse.json({ error: "Max 500 Items pro Request." }, { status: 400 });
    }

    const result = await runImport(items, {
      limit,
      dryRun,
      skipAi,
      skipPubChem,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[import-substances] Unhandled error:", message);
    return NextResponse.json(
      { error: message, details: "Interner Serverfehler." },
      { status: 500 },
    );
  }
}
