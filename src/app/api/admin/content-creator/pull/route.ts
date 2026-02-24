/**
 * POST /api/admin/content-creator/pull
 * Pull data from Wikidata and/or PubChem for a substance.
 * Returns JSON with { wikidata, pubchem, errors }.
 */

import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { fetchWikidataByName, fetchWikidataByQid } from "@/lib/connectors/wikidata";
import { fetchPubChemByCid, fetchPubChemByName } from "@/lib/connectors/pubchem";
import { logAudit } from "@/lib/generator/audit";

export async function POST(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated(request);
    if (!isAuth) {
      return Response.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    let body: {
      substanceId?: string;
      name?: string;
      wikidataQid?: string;
      pubchemCid?: number;
      sources?: string[];
    };

    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "Ungültiger Request-Body." }, { status: 400 });
    }

    const { name, wikidataQid, pubchemCid, sources = ["wikidata", "pubchem"], substanceId } = body;

    if (!name && !wikidataQid && !pubchemCid) {
      return Response.json({ ok: false, error: "Name, Wikidata QID oder PubChem CID erforderlich." }, { status: 400 });
    }

    await logAudit("data_pull_started", "substance", substanceId ?? "new", {
      name, wikidataQid, pubchemCid, sources,
    });

    const result: {
      wikidata: Awaited<ReturnType<typeof fetchWikidataByName>> | null;
      pubchem: Awaited<ReturnType<typeof fetchPubChemByName>> | null;
      errors: string[];
    } = { wikidata: null, pubchem: null, errors: [] };

    // Wikidata
    if (sources.includes("wikidata")) {
      try {
        if (wikidataQid) {
          result.wikidata = await fetchWikidataByQid(wikidataQid);
        } else if (name) {
          result.wikidata = await fetchWikidataByName(name);
        }
      } catch (err) {
        result.errors.push(`Wikidata: ${err instanceof Error ? err.message : "Fehler"}`);
      }
    }

    // PubChem
    if (sources.includes("pubchem")) {
      try {
        if (pubchemCid) {
          result.pubchem = await fetchPubChemByCid(pubchemCid);
        } else if (name) {
          result.pubchem = await fetchPubChemByName(name);
        }
      } catch (err) {
        result.errors.push(`PubChem: ${err instanceof Error ? err.message : "Fehler"}`);
      }
    }

    await logAudit("data_pull_finished", "substance", substanceId ?? "new", {
      hasWikidata: !!result.wikidata,
      hasPubchem: !!result.pubchem,
      errors: result.errors,
    });

    return Response.json(result);
  } catch (err) {
    console.error("[pull] Unhandled error:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Interner Serverfehler." },
      { status: 500 },
    );
  }
}
