import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const authenticated = await isAdminAuthenticated(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const { generatedArticleId } = body as { generatedArticleId?: string };

  if (!generatedArticleId) {
    return NextResponse.json(
      { error: "generatedArticleId ist erforderlich." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // 1. Fetch generated article
    const { data: generated, error: fetchError } = await supabase
      .from("generated_articles")
      .select("*")
      .eq("id", generatedArticleId)
      .single();

    if (fetchError || !generated) {
      return NextResponse.json(
        { error: "Generierter Artikel nicht gefunden." },
        { status: 404 }
      );
    }

    if (generated.status === "blocked") {
      return NextResponse.json(
        { error: "Geblockte Artikel können nicht übernommen werden." },
        { status: 400 }
      );
    }

    // 2. Fetch substance for title/slug
    const { data: substance } = await supabase
      .from("substances")
      .select("name, slug, categories")
      .eq("id", generated.substance_id)
      .single();

    if (!substance) {
      return NextResponse.json(
        { error: "Zugehörige Substanz nicht gefunden." },
        { status: 404 }
      );
    }

    const templateKey = generated.template_key || "";
    const templateSuffix = templateKey.replace(/_v\d+$/, "").replace(/_/g, " ");
    const title = `${substance.name} – ${templateSuffix.charAt(0).toUpperCase() + templateSuffix.slice(1)}`;
    const slug = `${substance.slug}-${templateKey.replace(/_/g, "-")}`;
    const category = Array.isArray(substance.categories) && substance.categories.length > 0
      ? substance.categories[0]
      : null;

    // 3. Create article in draft status
    const { data: article, error: articleError } = await supabase
      .schema("synapedia")
      .from("articles")
      .insert({
        title,
        slug,
        summary: `AI-generierter Artikel über ${substance.name}.`,
        content_mdx: generated.content_mdx,
        status: "draft",
        risk_level: "unknown",
        evidence_strength: "moderate",
        category,
      })
      .select()
      .single();

    if (articleError) {
      return NextResponse.json(
        { error: "Artikel konnte nicht erstellt werden: " + articleError.message },
        { status: 500 }
      );
    }

    // 4. Update generated article with mapping
    await supabase
      .from("generated_articles")
      .update({
        article_id: article.id,
        status: "mapped",
      })
      .eq("id", generatedArticleId);

    // 5. Audit log
    await supabase.from("audit_log").insert({
      action: "draft_mapped_to_article",
      entity_type: "article",
      entity_id: article.id,
      details: {
        generated_article_id: generatedArticleId,
        substance_name: substance.name,
        template_key: templateKey,
      },
    });

    return NextResponse.json({
      article_id: article.id,
      title,
      slug,
      status: "draft",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
