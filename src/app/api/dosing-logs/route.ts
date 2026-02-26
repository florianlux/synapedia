import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const parsed = parseInt(searchParams.get("limit") || "50");
  const limit = Math.min(Number.isFinite(parsed) ? parsed : 50, 200);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const substance = searchParams.get("substance");

  let query = supabase
    .from("dosing_logs")
    .select("*")
    .eq("user_id", user.id);

  if (from) {
    query = query.gte("taken_at", from);
  }
  if (to) {
    query = query.lte("taken_at", to);
  }
  if (substance) {
    query = query.ilike("substance", substance);
  }

  const { data, error } = await query
    .order("taken_at", { ascending: false })
    .limit(limit);

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
      { error: "Substanz und Einnahmezeitpunkt sind erforderlich" },
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

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID ist erforderlich" }, { status: 400 });
  }

  const { error } = await supabase
    .from("dosing_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
