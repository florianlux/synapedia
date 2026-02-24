import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  buildPrompts,
  callOpenAIForArticle,
  filterArticleContent,
} from "@/lib/ai/article-generator";
import type { ArticleTemplate } from "@/lib/types";
import type { SubstanceRow } from "@/lib/substances/schema";

export async function POST(request: NextRequest) {
  // Auth check
  const authenticated = await isAdminAuthenticated(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  // Check if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY ist nicht konfiguriert." },
      { status: 503 }
    );
  }

  // Parse request body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body." },
      { status: 400 }
    );
  }

  const {
    substanceId,
    templateKey,
    language = "de",
    tone = "scientific",
    length = "medium",
  } = body as {
    substanceId?: string;
    templateKey?: string;
    language?: string;
    tone?: string;
    length?: string;
  };

  if (!substanceId || !templateKey) {
    return NextResponse.json(
      { error: "substanceId und templateKey sind erforderlich." },
      { status: 400 }
    );
  }

  // Validate tone and length
  const validTones = ["scientific", "friendly", "clinical"];
  const validLengths = ["short", "medium", "long"];
  if (!validTones.includes(tone)) {
    return NextResponse.json(
      { error: `Ungültiger Ton. Erlaubt: ${validTones.join(", ")}` },
      { status: 400 }
    );
  }
  if (!validLengths.includes(length)) {
    return NextResponse.json(
      { error: `Ungültige Länge. Erlaubt: ${validLengths.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // 1. Fetch substance
    const { data: substance, error: substanceError } = await supabase
      .from("substances")
      .select("*")
      .eq("id", substanceId)
      .single();

    if (substanceError || !substance) {
      return NextResponse.json(
        { error: "Substanz nicht gefunden." },
        { status: 404 }
      );
    }

    // 2. Fetch template
    const { data: template, error: templateError } = await supabase
      .from("article_templates")
      .select("*")
      .eq("key", templateKey)
      .eq("enabled", true)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template nicht gefunden oder deaktiviert." },
        { status: 404 }
      );
    }

    // 3. Fetch substance sources
    const { data: sources } = await supabase
      .from("substance_sources")
      .select("*")
      .eq("substance_id", substanceId)
      .order("confidence", { ascending: false })
      .limit(10);

    // 4. Build prompts
    const { systemPrompt, userPrompt, citations } = buildPrompts({
      substance: substance as SubstanceRow,
      sources: (sources || []) as Array<{
        source_name: string;
        source_url: string;
        source_type: string;
        snippet: string;
        license_note: string;
        confidence: number;
      }>,
      template: template as ArticleTemplate,
      language,
      tone,
      length,
    });

    // 5. Call OpenAI
    const contentMdx = await callOpenAIForArticle(systemPrompt, userPrompt);

    // 6. Content safety filter
    const filterResult = filterArticleContent(contentMdx);

    const status = filterResult.passed ? "draft" : "blocked";
    const blockedReasons = filterResult.reasons;

    // 7. Store generated article
    const { data: generated, error: insertError } = await supabase
      .from("generated_articles")
      .insert({
        substance_id: substanceId,
        template_key: templateKey,
        content_mdx: contentMdx,
        citations: JSON.parse(JSON.stringify(citations)),
        model_info: {
          model: "gpt-4o-mini",
          template: templateKey,
          language,
          tone,
          length,
          generated_at: new Date().toISOString(),
        },
        status,
        blocked_reasons: blockedReasons,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[generate-article] Insert error:", insertError.message);
      // Still return the content even if DB insert fails
      return NextResponse.json({
        content_mdx: contentMdx,
        status,
        blocked_reasons: blockedReasons,
        citations,
        db_error: insertError.message,
      });
    }

    // 8. Audit log
    await supabase.from("audit_log").insert({
      action: "ai_generate_draft",
      entity_type: "substance",
      entity_id: substanceId,
      details: {
        template_key: templateKey,
        generated_article_id: generated?.id,
        status,
        blocked_reasons: blockedReasons,
        model: "gpt-4o-mini",
      },
    });

    return NextResponse.json({
      id: generated?.id,
      content_mdx: contentMdx,
      status,
      blocked_reasons: blockedReasons,
      citations,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unbekannter Fehler.";
    console.error("[generate-article]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
