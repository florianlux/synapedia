/**
 * POST /api/admin/content-creator/jobs  — create a batch job
 * GET  /api/admin/content-creator/jobs  — list / poll job status
 * Always returns JSON, even on unexpected errors.
 */

import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/generator/audit";

export async function GET(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated(request);
    if (!isAuth) {
      return Response.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

    let query = supabase
      .from("publish_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Compute summary counts
    const summary = {
      queued: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      total: data?.length ?? 0,
    };

    for (const job of data ?? []) {
      const s = job.status as keyof typeof summary;
      if (s in summary) summary[s]++;
    }

    return Response.json({ jobs: data ?? [], summary });
  } catch (err) {
    console.error("[jobs GET] Unhandled error:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Interner Serverfehler." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated(request);
    if (!isAuth) {
      return Response.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    let body: {
      type: string;
      payload: Record<string, unknown>;
      substanceId?: string;
    };

    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "Ungültiger Request-Body." }, { status: 400 });
    }

    const validTypes = ["import", "enrich", "generate", "media_fetch", "map_to_article", "publish", "batch"];
    if (!validTypes.includes(body.type)) {
      return Response.json({ ok: false, error: `Ungültiger Job-Typ. Erlaubt: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("publish_jobs")
      .insert({
        type: body.type,
        payload: body.payload,
        substance_id: body.substanceId ?? null,
        status: "queued",
      })
      .select("id, type, status, created_at")
      .single();

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    await logAudit("batch_started", "publish_job", data.id, {
      type: body.type,
      substanceId: body.substanceId,
    });

    return Response.json({ ok: true, job: data });
  } catch (err) {
    console.error("[jobs POST] Unhandled error:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Interner Serverfehler." },
      { status: 500 },
    );
  }
}
