/**
 * POST /api/admin/content-creator/publish
 * Map a generated draft to the articles table and optionally publish it.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { filterContent } from "@/lib/generator/content-filter";
import { logAudit } from "@/lib/generator/audit";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: NextRequest) {
  const isAuth = await isAdminAuthenticated(request);
  if (!isAuth) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let body: {
    substanceName: string;
    slug?: string;
    contentMdx: string;
    citations: Array<{ source: string; url: string; license: string; retrievedAt: string }>;
    category?: string;
    riskLevel?: string;
    publish?: boolean;
    substanceId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const {
    substanceName,
    contentMdx,
    citations,
    category = "Substanzen",
    riskLevel = "unknown",
    publish = false,
    substanceId,
  } = body;
  const slug = body.slug || slugify(substanceName);

  if (!substanceName || !contentMdx) {
    return NextResponse.json({ error: "substanceName und contentMdx sind erforderlich." }, { status: 400 });
  }

  // Pre-publish checks
  const filterResult = filterContent(contentMdx);

  if (filterResult.blocked) {
    await logAudit("blocked", "article", slug, { reasons: filterResult.reasons });
    return NextResponse.json({
      error: "Inhalt blockiert — enthält unzulässige Inhalte.",
      blocked: true,
      reasons: filterResult.reasons,
    }, { status: 422 });
  }

  // Publish checklist
  const errors: string[] = [];
  if (!contentMdx.includes("Hinweis:") && !contentMdx.includes("Disclaimer")) {
    errors.push("Disclaimer fehlt im Artikel.");
  }
  if (!citations || citations.length < 2) {
    errors.push("Mindestens 2 Quellen erforderlich (Wikidata + PubChem).");
  }

  if (publish && errors.length > 0) {
    return NextResponse.json({
      error: "Publish-Checklist nicht bestanden.",
      checklistErrors: errors,
    }, { status: 422 });
  }

  const supabase = createAdminClient();

  await logAudit("publish_attempted", "article", slug, {
    publish,
    substanceId,
    citationCount: citations?.length ?? 0,
  });

  // Check if article with this slug exists
  const { data: existing } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const status = publish ? "published" : "draft";
  const now = new Date().toISOString();

  let articleId: string;

  if (existing) {
    // Update existing article
    const { data, error } = await supabase
      .from("articles")
      .update({
        title: substanceName,
        content_mdx: contentMdx,
        status,
        risk_level: riskLevel,
        category,
        updated_at: now,
        ...(publish ? { published_at: now } : {}),
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    articleId = data.id;
  } else {
    // Create new article
    const { data, error } = await supabase
      .from("articles")
      .insert({
        title: substanceName,
        slug,
        summary: `Wissenschaftlicher Artikel über ${substanceName}`,
        content_mdx: contentMdx,
        status,
        risk_level: riskLevel,
        category,
        ...(publish ? { published_at: now } : {}),
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    articleId = data.id;
  }

  // Insert sources (best-effort)
  if (citations && citations.length > 0) {
    try {
      const sourceRows = citations.map((c) => ({
        title: `${c.source} — ${substanceName}`,
        url: c.url,
        doi: "",
        note: `Lizenz: ${c.license}. Abgerufen: ${c.retrievedAt}`,
      }));

      for (const row of sourceRows) {
        const { data: src } = await supabase
          .from("sources")
          .insert(row)
          .select("id")
          .single();

        if (src) {
          await supabase.from("article_sources").insert({
            article_id: articleId,
            source_id: src.id,
          });
        }
      }
    } catch {
      // Non-critical
    }
  }

  await logAudit(
    publish ? "published" : "mapped_to_article",
    "article",
    articleId,
    { slug, substanceId, status },
  );

  return NextResponse.json({
    articleId,
    slug,
    status,
    articleUrl: `/articles/${slug}`,
    checklistErrors: errors,
  });
}
