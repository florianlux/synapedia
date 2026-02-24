import { NextRequest, NextResponse } from "next/server";
import { runAutofill, isAiEnabled } from "@/lib/ai/provider";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: "AI ist nicht konfiguriert. Setze OPENAI_API_KEY oder ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const { title, subtitle, category, templateSections, existingDraft } = body as {
    title?: string;
    subtitle?: string;
    category?: string;
    templateSections?: { key: string; title: string; aiHints?: string }[];
    existingDraft?: string;
  };

  if (!title) {
    return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
  }

  try {
    // Create AI job record
    const supabase = await createClient();
    const { data: job, error: jobError } = await supabase
      .schema("synapedia")
      .from("ai_jobs")
      .insert({
        type: "autofill",
        status: "running",
        input_json: { title, subtitle, category, templateSections },
      })
      .select()
      .single();

    if (jobError) {
      console.error("[autofill] Job creation failed:", jobError.message);
    }

    const output = await runAutofill({ title, subtitle, category, templateSections, existingDraft });

    // Update job with result
    if (job) {
      await supabase
        .schema("synapedia")
        .from("ai_jobs")
        .update({ status: "done", output_json: output })
        .eq("id", job.id);
    }

    return NextResponse.json({ jobId: job?.id ?? null, output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
