import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const { articleId, outputJson } = body as {
    articleId?: string;
    outputJson?: Record<string, unknown>;
  };

  if (!articleId || !outputJson) {
    return NextResponse.json(
      { error: "articleId und outputJson sind erforderlich." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Merge output into article content_json
    const { error: updateError } = await supabase
      .from("articles")
      .update({ content_json: outputJson })
      .eq("id", articleId);

    if (updateError) {
      return NextResponse.json(
        { error: "Artikel konnte nicht aktualisiert werden: " + updateError.message },
        { status: 500 }
      );
    }

    // Create graph edges if suggested
    const suggestedEdges = outputJson.suggestedGraphEdges as
      | { from_type: string; from_key: string; to_type: string; to_key: string; relation: string }[]
      | undefined;

    if (suggestedEdges && Array.isArray(suggestedEdges) && suggestedEdges.length > 0) {
      const edges = suggestedEdges.map((e) => ({
        article_id: articleId,
        from_type: e.from_type,
        from_key: e.from_key,
        to_type: e.to_type,
        to_key: e.to_key,
        relation: e.relation,
        confidence: 0.7,
        origin: "ai",
      }));

      const { error: edgeError } = await supabase
        .from("graph_edges")
        .insert(edges);

      if (edgeError) {
        console.error("[apply] Graph edges creation failed:", edgeError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}
