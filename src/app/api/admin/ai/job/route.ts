import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Job-ID ist erforderlich." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .schema("synapedia")
      .from("ai_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Job nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}
