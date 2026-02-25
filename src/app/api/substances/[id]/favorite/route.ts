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

  const { id: substanceId } = await params;

  const { error } = await supabase.from("substance_favorites").insert({
    substance_id: substanceId,
    user_id: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      // Already favorited, that's ok
      return NextResponse.json({ favorited: true });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ favorited: true }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { id: substanceId } = await params;

  await supabase
    .from("substance_favorites")
    .delete()
    .eq("substance_id", substanceId)
    .eq("user_id", user.id);

  return NextResponse.json({ favorited: false });
}
