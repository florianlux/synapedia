import { NextRequest, NextResponse } from "next/server";
import type { BehaviorEventType } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const VALID_EVENT_TYPES: BehaviorEventType[] = [
  "search",
  "click",
  "page_view",
  "reading_time",
  "graph_interact",
  "comparison",
  "interaction_check",
];

/**
 * POST /api/neurocodex/events
 * Track a behavior event for analytics.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, event_type, event_data, page_url } = body;

    if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) {
      return NextResponse.json(
        { error: "Ungültiger event_type" },
        { status: 400 },
      );
    }

    // In demo mode (no Supabase), accept but don't persist
    if (!isSupabaseConfigured()) {
      console.log(`[Events] Demo mode – tracked ${event_type}:`, event_data);
      return NextResponse.json({ ok: true, demo: true });
    }

    const { trackBehaviorEvent } = await import("@/lib/db/neurocodex");
    const event = await trackBehaviorEvent({
      session_id: session_id ?? null,
      user_id: null,
      event_type,
      event_data: event_data ?? {},
      page_url: page_url ?? null,
    });

    return NextResponse.json({ ok: true, id: event.id });
  } catch (err) {
    console.error("[Events]", err);
    return NextResponse.json(
      { error: "Ereignis konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
