import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * GET /api/neurocodex/profile?user_id=<uuid>
 * Return user preferences, or defaults in demo mode.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json(
      { error: "user_id ist erforderlich" },
      { status: 400 },
    );
  }

  // Demo mode defaults
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      user_id: userId,
      sensitivity_flags: [],
      display_settings: {},
      harm_reduction_alerts: true,
      demo: true,
    });
  }

  try {
    const { getUserPreferences } = await import("@/lib/db/neurocodex");
    const prefs = await getUserPreferences(userId);
    return NextResponse.json(
      prefs ?? {
        user_id: userId,
        sensitivity_flags: [],
        display_settings: {},
        harm_reduction_alerts: true,
      },
    );
  } catch (err) {
    console.error("[Profile]", err);
    return NextResponse.json(
      { error: "Profil konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/neurocodex/profile
 * Update user preferences.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, sensitivity_flags, display_settings, harm_reduction_alerts } =
      body;

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id ist erforderlich" },
        { status: 400 },
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, demo: true });
    }

    const { upsertUserPreferences } = await import("@/lib/db/neurocodex");
    const prefs = await upsertUserPreferences(user_id, {
      sensitivity_flags,
      display_settings,
      harm_reduction_alerts,
    });

    return NextResponse.json(prefs);
  } catch (err) {
    console.error("[Profile]", err);
    return NextResponse.json(
      { error: "Profil konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
