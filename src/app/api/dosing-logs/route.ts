import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const parsed = parseInt(searchParams.get("limit") || "50");
  const limit = Math.min(Number.isFinite(parsed) ? parsed : 50, 200);

  let query = supabase
    .from("dosing_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false })
    .limit(limit);

  if (from) {
    query = query.gte("taken_at", from);
  }
  if (to) {
    query = query.lte("taken_at", to);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.substance || !body.taken_at) {
    return NextResponse.json(
      { error: "substance und taken_at sind Pflichtfelder" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("dosing_logs")
    .insert({
      user_id: user.id,
      substance: body.substance,
      dose_mg: body.dose_mg ?? null,
      dose_g: body.dose_g ?? null,
      route: body.route || null,
      notes: body.notes || null,
      taken_at: body.taken_at,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
