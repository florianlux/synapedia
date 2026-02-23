import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchSubstancesFromApi } from "@/lib/importers/psychonautwiki";
import { generateArticleMdx } from "@/lib/article-generator";
import { checkContent } from "@/lib/content-filter";
import type { Substance } from "@/lib/types";

// ---------------------------------------------------------------------------
// POST /api/admin/substances/jobs/run — execute queued jobs
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { job_ids?: string[]; type?: string };
    const supabase = await createClient();

    // Build query for jobs to run
    let query = supabase
      .from("substance_jobs")
      .select("*")
      .eq("status", "queued")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(5);

    if (body.job_ids?.length) {
      query = query.in("id", body.job_ids);
    } else if (body.type) {
      query = query.eq("type", body.type);
    }

    const { data: jobs, error: fetchError } = await query;
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: "No queued jobs found", results: [] });
    }

    const results: { job_id: string; status: string; error?: string }[] = [];

    for (const job of jobs) {
      // Mark running
      await supabase
        .from("substance_jobs")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
          attempts: (job.attempts ?? 0) + 1,
        })
        .eq("id", job.id);

      try {
        if (job.type === "import_psychonautwiki") {
          const result = await runImportJob(supabase);
          await supabase
            .from("substance_jobs")
            .update({
              status: "succeeded",
              finished_at: new Date().toISOString(),
              result_json: result,
            })
            .eq("id", job.id);

          // Audit log
          await supabase.from("audit_log").insert({
            action: "import.run",
            entity_type: "substance_job",
            entity_id: job.id,
            details: result,
          });

          results.push({ job_id: job.id, status: "succeeded" });
        } else if (job.type === "generate_article") {
          const substanceId = job.substance_id ?? job.payload?.substance_id;
          if (!substanceId) throw new Error("No substance_id provided");

          const result = await runGenerateArticleJob(
            supabase,
            substanceId as string,
            job.id
          );
          await supabase
            .from("substance_jobs")
            .update({
              status: result.blocked ? "failed" : "succeeded",
              finished_at: new Date().toISOString(),
              result_json: result,
              error: result.blocked ? "Content filter blocked publication" : null,
            })
            .eq("id", job.id);

          results.push({
            job_id: job.id,
            status: result.blocked ? "failed" : "succeeded",
            error: result.blocked ? "Content filter blocked" : undefined,
          });
        } else {
          throw new Error(`Unknown job type: ${job.type}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await supabase
          .from("substance_jobs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error: errorMsg,
          })
          .eq("id", job.id);

        results.push({ job_id: job.id, status: "failed", error: errorMsg });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/substances/jobs — list jobs
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("substance_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Job Runners
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runImportJob(supabase: any) {
  const imported = await fetchSubstancesFromApi();
  let importedCount = 0;
  let updatedCount = 0;

  for (const sub of imported) {
    // Upsert substance
    const { data: existing } = await supabase
      .from("substances")
      .select("id")
      .eq("slug", sub.slug)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("substances")
        .update({
          name: sub.name,
          aliases: sub.aliases,
          class_primary: sub.class_primary,
          class_secondary: sub.class_secondary,
          summary: sub.summary,
          source_license: sub.source_license,
          source_license_url: sub.source_license_url,
          imported_at: sub.imported_at,
        })
        .eq("id", existing.id);
      updatedCount++;

      // Update source
      await supabase
        .from("substance_sources")
        .upsert(
          {
            substance_id: existing.id,
            source_url: sub.source_url,
            source_domain: "psychonautwiki.org",
            source_title: `PsychonautWiki: ${sub.name}`,
            fetched_at: sub.imported_at,
            parsed_json: {
              effects: sub.effects,
              interactions: sub.interactions,
              addiction_potential: sub.addiction_potential,
              toxicity: sub.toxicity,
              tolerance: sub.tolerance,
            },
          },
          { onConflict: "substance_id,source_url", ignoreDuplicates: true }
        );
    } else {
      const { data: newSub } = await supabase
        .from("substances")
        .insert({
          slug: sub.slug,
          name: sub.name,
          aliases: sub.aliases,
          class_primary: sub.class_primary,
          class_secondary: sub.class_secondary,
          summary: sub.summary,
          source_license: sub.source_license,
          source_license_url: sub.source_license_url,
          imported_at: sub.imported_at,
          status: "draft",
          risk_level: "unknown",
        })
        .select("id")
        .single();

      if (newSub) {
        await supabase.from("substance_sources").insert({
          substance_id: newSub.id,
          source_url: sub.source_url,
          source_domain: "psychonautwiki.org",
          source_title: `PsychonautWiki: ${sub.name}`,
          fetched_at: sub.imported_at,
          parsed_json: {
            effects: sub.effects,
            interactions: sub.interactions,
            addiction_potential: sub.addiction_potential,
            toxicity: sub.toxicity,
            tolerance: sub.tolerance,
          },
        });

        // Audit
        await supabase.from("audit_log").insert({
          action: "substance.created",
          entity_type: "substance",
          entity_id: newSub.id,
          details: { name: sub.name, slug: sub.slug },
        });
      }
      importedCount++;
    }
  }

  return { imported_count: importedCount, updated_count: updatedCount };
}

async function runGenerateArticleJob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  substanceId: string,
  jobId: string
) {
  // Load substance
  const { data: substance, error } = await supabase
    .from("substances")
    .select("*")
    .eq("id", substanceId)
    .single();

  if (error || !substance) {
    throw new Error("Substance not found");
  }

  const sub = substance as Substance;

  // Load parsed data from sources
  const { data: sources } = await supabase
    .from("substance_sources")
    .select("parsed_json, source_url")
    .eq("substance_id", substanceId);

  const parsedData = sources?.[0]?.parsed_json ?? null;

  // Generate MDX
  const contentMdx = generateArticleMdx(sub, parsedData);

  // Content filter
  const filterResult = checkContent(contentMdx);
  const blocked = !filterResult.passed;

  if (blocked) {
    // Audit log: publish blocked
    await supabase.from("audit_log").insert({
      action: "publish.blocked",
      entity_type: "generated_article",
      entity_id: jobId,
      details: {
        substance_id: substanceId,
        violations: filterResult.violations,
      },
    });
  }

  // Save generated article
  const citations = (sources ?? []).map(
    (s: { source_url: string }) => ({
      url: s.source_url,
      title: `PsychonautWiki: ${sub.name}`,
      imported_at: sub.imported_at,
    })
  );

  const { data: genArticle } = await supabase
    .from("generated_articles")
    .insert({
      substance_id: substanceId,
      status: "draft",
      content_mdx: blocked
        ? `> ⚠️ CONTENT FILTER WARNUNG: ${filterResult.violations.join("; ")}\n\n${contentMdx}`
        : contentMdx,
      citations,
      model_info: { generator: "template-v1", blocked },
    })
    .select("id")
    .single();

  // Audit log: draft generated
  await supabase.from("audit_log").insert({
    action: "draft.generated",
    entity_type: "generated_article",
    entity_id: genArticle?.id,
    details: {
      substance_id: substanceId,
      substance_name: sub.name,
      blocked,
    },
  });

  // If not blocked, also create/update in articles table
  if (!blocked) {
    const { data: existingArticle } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", sub.slug)
      .maybeSingle();

    if (existingArticle) {
      await supabase
        .from("articles")
        .update({
          title: sub.name,
          summary: sub.summary ?? `Informationen zu ${sub.name}`,
          content_mdx: contentMdx,
          status: "draft",
          risk_level: sub.risk_level === "unknown" ? "moderate" : sub.risk_level,
          category: sub.class_secondary ?? sub.class_primary,
        })
        .eq("id", existingArticle.id);

      // Link generated article
      if (genArticle) {
        await supabase
          .from("generated_articles")
          .update({ article_id: existingArticle.id })
          .eq("id", genArticle.id);
      }

      await supabase.from("audit_log").insert({
        action: "article.mapped",
        entity_type: "article",
        entity_id: existingArticle.id,
        details: { substance_id: substanceId, updated: true },
      });
    } else {
      const { data: newArticle } = await supabase
        .from("articles")
        .insert({
          slug: sub.slug,
          title: sub.name,
          subtitle: sub.class_primary ?? null,
          summary: sub.summary ?? `Informationen zu ${sub.name}`,
          content_mdx: contentMdx,
          status: "draft",
          risk_level: sub.risk_level === "unknown" ? "moderate" : sub.risk_level,
          category: sub.class_secondary ?? sub.class_primary,
        })
        .select("id")
        .single();

      if (newArticle && genArticle) {
        await supabase
          .from("generated_articles")
          .update({ article_id: newArticle.id })
          .eq("id", genArticle.id);
      }

      await supabase.from("audit_log").insert({
        action: "article.mapped",
        entity_type: "article",
        entity_id: newArticle?.id,
        details: { substance_id: substanceId, created: true },
      });
    }
  }

  return {
    generated_article_id: genArticle?.id,
    blocked,
    violations: filterResult.violations,
  };
}
