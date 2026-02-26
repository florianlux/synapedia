import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { id: postId } = await params;

  // Check if already voted
  const { data: existing } = await supabase
    .from("feed_post_votes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Remove vote (toggle)
    await supabase
      .from("feed_post_votes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    return NextResponse.json({ voted: false });
  }

  // Add vote
  const { error } = await supabase.from("feed_post_votes").insert({
    post_id: postId,
    user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ voted: true });
}
