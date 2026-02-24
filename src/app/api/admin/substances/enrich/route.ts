import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  sanitizeSubstancePayload,
  sanitizeAliasPayload,
  sanitizeEnrichmentJobPayload,
} from "@/lib/substances/sanitize";

/**
 * POST /api/admin/substances/enrich
 * Process enrichment for a single substance (called by queue worker or directly).
 * Body: { substanceId: string }
 *
 * GET /api/admin/substances/enrich
 * Get enrichment job status summary.
 */
export async function POST(request: NextRequest) {
  const isAuth = await isAdminAuthenticated(request);
  if (!isAuth) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let body: { substanceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const { substanceId } = body;
  if (!substanceId) {
    return NextResponse.json({ error: "substanceId ist erforderlich." }, { status: 400 });
  }

  try {
    // Use server client for API routes (not the browser client)
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Get the substance
    const { data: substance, error: fetchError } = await supabase
      .from("substances")
      .select("*")
      .eq("id", substanceId)
      .maybeSingle();

    if (fetchError || !substance) {
      return NextResponse.json({ error: "Substanz nicht gefunden." }, { status: 404 });
    }

    // Update job status to running
    await supabase
      .from("enrichment_jobs")
      .update(
        sanitizeEnrichmentJobPayload({
          status: "running",
          phase: "facts",
          updated_at: new Date().toISOString(),
        }),
      )
      .eq("substance_id", substanceId)
      .eq("status", "queued");

    // Phase A: PubChem facts
    const { fetchPubChemFacts } = await import("@/lib/substances/enrichment-connectors");
    const pubchem = await fetchPubChemFacts(substance.name);

    await supabase
      .from("enrichment_jobs")
      .update(
        sanitizeEnrichmentJobPayload({
          phase: "targets",
          updated_at: new Date().toISOString(),
        }),
      )
      .eq("substance_id", substanceId)
      .eq("status", "running");

    // Phase B: ChEMBL targets
    const { fetchChEMBLTargets } = await import("@/lib/substances/enrichment-connectors");
    const chemblResult = await fetchChEMBLTargets(substance.name);
    const targets = chemblResult?.targets ?? [];

    await supabase
      .from("enrichment_jobs")
      .update(
        sanitizeEnrichmentJobPayload({
          phase: "summary",
          updated_at: new Date().toISOString(),
        }),
      )
      .eq("substance_id", substanceId)
      .eq("status", "running");

    // Phase C: Build structured summary
    const { assembleEnrichmentData } = await import("@/lib/substances/enrichment-pipeline");
    const { data: allSubstances } = await supabase
      .from("substances")
      .select("slug, tags")
      .neq("id", substanceId);

    const enrichmentData = assembleEnrichmentData(
      substance.name,
      substance.slug,
      pubchem,
      targets,
      substance.categories ?? [],
      (allSubstances ?? []).map((s: { slug: string; tags: string[] | null }) => ({
        slug: s.slug,
        tags: s.tags ?? [],
      }))
    );

    await supabase
      .from("enrichment_jobs")
      .update(
        sanitizeEnrichmentJobPayload({
          phase: "crosslink",
          updated_at: new Date().toISOString(),
        }),
      )
      .eq("substance_id", substanceId)
      .eq("status", "running");

    // Phase D: Store aliases from PubChem synonyms (non-blocking)
    if (pubchem?.synonyms && pubchem.synonyms.length > 0) {
      try {
        const aliases = pubchem.synonyms.map((syn) =>
          sanitizeAliasPayload({
            substance_id: substanceId,
            alias: syn,
            alias_type: "synonym" as const,
            source: "pubchem",
          }),
        );
        // Insert individually, ignoring duplicates, instead of upsert with
        // composite onConflict which can trigger PostgREST constraint errors.
        for (const alias of aliases) {
          const { error: aliasErr } = await supabase
            .from("substance_aliases")
            .insert(alias);
          if (aliasErr && aliasErr.code !== "23505") {
            console.error(`[enrich] Alias insert error:`, aliasErr.message);
          }
        }
      } catch (aliasErr) {
        console.error(`[enrich] Alias batch error:`, aliasErr instanceof Error ? aliasErr.message : String(aliasErr));
      }
    }

    if (pubchem?.iupacName) {
      try {
        const { error: iupacErr } = await supabase
          .from("substance_aliases")
          .insert(
            sanitizeAliasPayload({
              substance_id: substanceId,
              alias: pubchem.iupacName,
              alias_type: "iupac" as const,
              source: "pubchem",
            }),
          );
        if (iupacErr && iupacErr.code !== "23505") {
          console.error(`[enrich] IUPAC alias error:`, iupacErr.message);
        }
      } catch (iupacErr) {
        console.error(`[enrich] IUPAC alias error:`, iupacErr instanceof Error ? iupacErr.message : String(iupacErr));
      }
    }

    // Update the substance with enrichment data
    const { error: updateError } = await supabase
      .from("substances")
      .update(
        sanitizeSubstancePayload({
          external_ids: enrichmentData.external_ids,
          canonical_name: enrichmentData.canonical_name,
          tags: enrichmentData.tags,
          related_slugs: enrichmentData.related_slugs,
          summary: enrichmentData.summary || substance.summary,
          mechanism: enrichmentData.mechanism || substance.mechanism,
          enrichment: enrichmentData.enrichment,
          confidence: {
            ...(substance.confidence ?? {}),
            summary: pubchem ? 0.4 : 0,
            mechanism: targets.length > 0 ? 0.5 : 0,
          },
        }),
      )
      .eq("id", substanceId);

    if (updateError) {
      // Mark job as error
      await supabase
        .from("enrichment_jobs")
        .update(
          sanitizeEnrichmentJobPayload({
            status: "error",
            phase: "error",
            error_message: updateError.message,
            updated_at: new Date().toISOString(),
          }),
        )
        .eq("substance_id", substanceId);

      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Mark job as done
    await supabase
      .from("enrichment_jobs")
      .update(
        sanitizeEnrichmentJobPayload({
          status: "done",
          phase: "done",
          updated_at: new Date().toISOString(),
        }),
      )
      .eq("substance_id", substanceId);

    return NextResponse.json({
      success: true,
      substanceId,
      enrichment: {
        hasPubChem: !!pubchem,
        hasChEMBL: targets.length > 0,
        tags: enrichmentData.tags,
        relatedCount: enrichmentData.related_slugs.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[enrich] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const isAuth = await isAdminAuthenticated(request);
  if (!isAuth) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: jobs, error } = await supabase
      .from("enrichment_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const summary = {
      total: jobs?.length ?? 0,
      queued: jobs?.filter((j: { status: string }) => j.status === "queued").length ?? 0,
      running: jobs?.filter((j: { status: string }) => j.status === "running").length ?? 0,
      done: jobs?.filter((j: { status: string }) => j.status === "done").length ?? 0,
      error: jobs?.filter((j: { status: string }) => j.status === "error").length ?? 0,
    };

    return NextResponse.json({ summary, jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
