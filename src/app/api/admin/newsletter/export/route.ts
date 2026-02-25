import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// TODO: Later integrate with Mailchimp/Brevo/Resend
// This endpoint exports newsletter subscribers for admin use only.
// Protected by service role key - do NOT expose to client.

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id, username, newsletter_opt_in, created_at")
      .eq("newsletter_opt_in", true)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      count: data?.length ?? 0,
      subscribers: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Newsletter export fehlgeschlagen" },
      { status: 500 }
    );
  }
}
