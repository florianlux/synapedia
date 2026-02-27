import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * POST /api/neurocodex/sync
 * Trigger a sync run for a given entity type from Synapedia.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity_type, consumer_name, batch_size } = body;

    if (!entity_type || !consumer_name) {
      return NextResponse.json(
        { error: "entity_type und consumer_name sind erforderlich" },
        { status: 400 },
      );
    }

    if (!isSupabaseConfigured()) {
      console.log(
        `[Sync] Demo mode – sync skipped for ${consumer_name}/${entity_type}`,
      );
      return NextResponse.json({
        status: "success",
        records_processed: 0,
        errors: 0,
        cursor_after: null,
        duration_ms: 0,
        demo: true,
      });
    }

    const { runSync } = await import("@/lib/neurocodex/sync-consumer");
    const result = await runSync(entity_type, consumer_name, batch_size ?? 50);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Sync]", err);
    return NextResponse.json(
      { error: "Sync fehlgeschlagen." },
      { status: 500 },
    );
  }
}
