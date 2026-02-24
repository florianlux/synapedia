/**
 * POST /api/admin/content-creator/generate
 * Generate an MDX article draft from substance data + template.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { generateArticleMdx, type GeneratorInput } from "@/lib/generator/template-renderer";
import { logAudit } from "@/lib/generator/audit";

export async function POST(request: NextRequest) {
  const isAuth = await isAdminAuthenticated(request);
  if (!isAuth) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
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
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const { substanceName, slug, wikidata, pubchem, riskLevel, substanceId, templateKey } = body;

  if (!substanceName || !slug) {
    return NextResponse.json({ error: "substanceName und slug sind erforderlich." }, { status: 400 });
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

  return NextResponse.json({
    contentMdx: result.contentMdx,
    citations: result.citations,
    blocked: result.filterResult.blocked,
    blockedReasons: result.filterResult.reasons,
  });
}
