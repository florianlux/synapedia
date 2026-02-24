/**
 * Hardened PubChem connector.
 *
 * Design:
 * - Never throws on non-2xx responses
 * - 404 → status "not_found" (not an error)
 * - Timeout (10s) + single retry on transient errors (5xx, network)
 * - If CID is missing/invalid, optionally resolves by name search
 * - Never blocks the import run
 */

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const TIMEOUT_MS = 10_000;

export type PubChemFetchStatus = "ok" | "not_found" | "error" | "skipped";

export interface PubChemHardenedData {
  cid: number;
  iupacName: string;
  molecularFormula: string;
  molecularWeight: string;
  synonyms: string[];
}

export interface PubChemHardenedResult {
  status: PubChemFetchStatus;
  data: PubChemHardenedData | null;
  error?: string;
}

/* ---------- Internal fetch with retry ---------- */

async function fetchWithRetry(
  url: string,
  retries = 1,
): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

      // 404 is a valid "not found" — return it directly
      if (res.status === 404) return res;

      // 2xx → success
      if (res.ok) return res;

      // 5xx or other transient → retry
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      // Non-retryable non-2xx
      return res;
    } catch (err) {
      // Network error or timeout → retry once
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error(`[PubChem] Fetch failed for ${url}:`, err instanceof Error ? err.message : err);
      return null;
    }
  }
  return null;
}

/* ---------- CID resolution by name ---------- */

async function resolveCidByName(name: string): Promise<number | null> {
  try {
    const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(name)}/cids/JSON`;
    const res = await fetchWithRetry(url);
    if (!res || !res.ok) return null;

    const data = await res.json() as { IdentifierList?: { CID?: number[] } };
    return data?.IdentifierList?.CID?.[0] ?? null;
  } catch {
    return null;
  }
}

/* ---------- Main entry point ---------- */

/**
 * Fetch PubChem data with hardened error handling.
 * Never throws. Returns structured status.
 */
export async function fetchPubChemHardened(
  name: string,
  cid?: number,
): Promise<PubChemHardenedResult> {
  try {
    // Resolve CID if not provided
    let effectiveCid = cid;
    if (!effectiveCid || effectiveCid <= 0) {
      effectiveCid = await resolveCidByName(name) ?? undefined;
    }

    if (!effectiveCid) {
      return { status: "not_found", data: null };
    }

    // Fetch properties
    const propsUrl = `${PUBCHEM_BASE}/compound/cid/${effectiveCid}/property/IUPACName,MolecularFormula,MolecularWeight/JSON`;
    const propsRes = await fetchWithRetry(propsUrl);

    if (!propsRes) {
      return { status: "error", data: null, error: "Network/timeout error" };
    }

    if (propsRes.status === 404) {
      return { status: "not_found", data: null };
    }

    if (!propsRes.ok) {
      return { status: "error", data: null, error: `HTTP ${propsRes.status}` };
    }

    const propsData = await propsRes.json() as {
      PropertyTable?: {
        Properties?: Array<{
          IUPACName?: string;
          MolecularFormula?: string;
          MolecularWeight?: number;
        }>;
      };
    };
    const props = propsData?.PropertyTable?.Properties?.[0];

    // Fetch synonyms (best-effort)
    let synonyms: string[] = [];
    try {
      const synUrl = `${PUBCHEM_BASE}/compound/cid/${effectiveCid}/synonyms/JSON`;
      const synRes = await fetchWithRetry(synUrl);
      if (synRes?.ok) {
        const synData = await synRes.json() as {
          InformationList?: { Information?: Array<{ Synonym?: string[] }> };
        };
        synonyms = synData?.InformationList?.Information?.[0]?.Synonym?.slice(0, 20) ?? [];
      }
    } catch {
      // Synonyms are best-effort
    }

    return {
      status: "ok",
      data: {
        cid: effectiveCid,
        iupacName: props?.IUPACName ?? "",
        molecularFormula: props?.MolecularFormula ?? "",
        molecularWeight: props?.MolecularWeight?.toString() ?? "",
        synonyms,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown PubChem error";
    console.error(`[PubChem Hardened] Error for ${name}:`, message);
    return { status: "error", data: null, error: message };
  }
}
