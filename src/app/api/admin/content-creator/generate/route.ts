/**
 * POST /api/admin/content-creator/generate
 * Generate an MDX article draft from substance data + template.
 * Upserts the draft into public.articles by substance_slug.
 * Returns { contentMdx, citations, blocked, blockedReasons, articleStatus }.
 */

import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { generateArticleMdx, type GeneratorInput } from "@/lib/generator/template-renderer";
import { logAudit } from "@/lib/generator/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated(request);
    if (!isAuth) {
      return Response.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    let body: {
      substanceId?: string;
      substanceName: string;
      slug: string;
      templateKey?: string;
      wikidata?: GeneratorInput["wikidata"];
      pubchem?: GeneratorInput["pubchem"];
      riskLevel?: string;
    };

    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "Ungültiger Request-Body." }, { status: 400 });
    }

    const { substanceName, slug, wikidata, pubchem, riskLevel, substanceId, templateKey } = body;

    if (!substanceName?.trim() || !slug?.trim()) {
      return Response.json({ ok: false, error: "substanceName und slug sind erforderlich." }, { status: 400 });
    }

    const result = generateArticleMdx({
      substanceName,
      slug,
      wikidata: wikidata ?? null,
      pubchem: pubchem ?? null,
      riskLevel,
    });

    await logAudit("draft_generated", "substance", substanceId ?? slug, {
      templateKey: templateKey ?? "default",
      citationCount: result.citations.length,
      blocked: result.filterResult.blocked,
      blockedReasons: result.filterResult.reasons,
    });

    // Upsert into public.articles by substance_slug (best-effort)
    let articleStatus: "created" | "updated" | "skipped" = "skipped";
    let articleId: string | null = null;

    if (!result.filterResult.blocked) {
      try {
        const supabase = createAdminClient();
        const now = new Date().toISOString();

        const sourcesJsonb = result.citations.map((c) => ({
          source: c.source,
          url: c.url,
          license: c.license,
          retrievedAt: c.retrievedAt,
        }));

        const generationMeta = {
          templateKey: templateKey ?? "default",
          generatedAt: now,
          wikidataId: wikidata?.wikidataId ?? null,
          pubchemCid: pubchem?.cid ?? null,
        };

        // Check if article with this substance_slug exists
        const { data: existing } = await supabase
          .from("articles")
          .select("id")
          .eq("substance_slug", slug)
          .maybeSingle();

        if (existing) {
          const { data, error } = await supabase
            .from("articles")
            .update({
              title: substanceName,
              content_mdx: result.contentMdx,
              summary: `Wissenschaftlicher Artikel über ${substanceName}`,
              sources: sourcesJsonb,
              generation_meta: generationMeta,
              ai_model: "template-renderer",
              substance_id: substanceId ?? null,
              updated_at: now,
            })
            .eq("id", existing.id)
            .select("id")
            .single();

          if (error) {
            console.error("[generate] DB update error:", error.message);
          } else {
            articleStatus = "updated";
            articleId = data.id;
          }
        } else {
          const { data, error } = await supabase
            .from("articles")
            .insert({
              title: substanceName,
              slug,
              substance_slug: slug,
              summary: `Wissenschaftlicher Artikel über ${substanceName}`,
              content_mdx: result.contentMdx,
              status: "draft",
              risk_level: riskLevel ?? "unknown",
              sources: sourcesJsonb,
              generation_meta: generationMeta,
              ai_model: "template-renderer",
              substance_id: substanceId ?? null,
            })
            .select("id")
            .single();

          if (error) {
            console.error("[generate] DB insert error:", error.message);
          } else {
            articleStatus = "created";
            articleId = data.id;
          }
        }
      } catch (err) {
        // DB upsert is best-effort; content generation still succeeds
        console.error("[generate] DB upsert failed:", err instanceof Error ? err.message : err);
      }
    }

    return Response.json({
      contentMdx: result.contentMdx,
      citations: result.citations,
      blocked: result.filterResult.blocked,
      blockedReasons: result.filterResult.reasons,
      articleStatus,
      articleId,
    });
  } catch (err) {
    console.error("[generate] Unhandled error:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Interner Serverfehler." },
      { status: 500 },
    );
  }
}
