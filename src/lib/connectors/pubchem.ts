/**
 * PubChem connector — fetches compound data from PubChem PUG REST API.
 * No HTML scraping. Rate-limited to respect PubChem policies.
 */

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const RATE_LIMIT_MS = parseInt(process.env.PUBCHEM_RATE_LIMIT_MS ?? "350", 10);

let lastRequestTime = 0;

async function rateLimitedFetch(url: string, timeout = 15_000): Promise<Response> {
  const now = Date.now();
  const waitTime = Math.max(0, RATE_LIMIT_MS - (now - lastRequestTime));
  if (waitTime > 0) {
    await new Promise((r) => setTimeout(r, waitTime));
  }
  lastRequestTime = Date.now();
  return fetch(url, { signal: AbortSignal.timeout(timeout) });
}

export interface PubChemCompoundData {
  cid: number;
  iupacName: string;
  molecularFormula: string;
  molecularWeight: string;
  isomericSmiles: string;
  canonicalSmiles: string;
  inchi: string;
  inchiKey: string;
  synonyms: string[];
  description: string;
  pharmacology: string;
  sourceUrl: string;
  retrievedAt: string;
}

/**
 * Fetch compound data from PubChem by CID.
 */
export async function fetchPubChemByCid(cid: number): Promise<PubChemCompoundData | null> {
  try {
    const [props, synonyms, desc] = await Promise.all([
      fetchProperties(cid),
      fetchSynonyms(cid),
      fetchDescription(cid),
    ]);

    if (!props) return null;

    return {
      cid,
      iupacName: props.IUPACName ?? "",
      molecularFormula: props.MolecularFormula ?? "",
      molecularWeight: props.MolecularWeight?.toString() ?? "",
      isomericSmiles: props.IsomericSMILES ?? "",
      canonicalSmiles: props.CanonicalSMILES ?? "",
      inchi: props.InChI ?? "",
      inchiKey: props.InChIKey ?? "",
      synonyms: synonyms.slice(0, 20),
      description: desc.description,
      pharmacology: desc.pharmacology,
      sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      retrievedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[PubChem] Error fetching CID ${cid}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Fetch compound data from PubChem by name.
 */
export async function fetchPubChemByName(name: string): Promise<PubChemCompoundData | null> {
  try {
    const cidUrl = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(name)}/cids/JSON`;
    const cidRes = await rateLimitedFetch(cidUrl);
    if (!cidRes.ok) return null;

    const cidData = await cidRes.json() as { IdentifierList?: { CID?: number[] } };
    const cid = cidData?.IdentifierList?.CID?.[0];
    if (!cid) return null;

    return fetchPubChemByCid(cid);
  } catch (err) {
    console.error(`[PubChem] Error resolving name "${name}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

/* ---- internal fetchers ---- */

interface PubChemProps {
  IUPACName?: string;
  MolecularFormula?: string;
  MolecularWeight?: number;
  IsomericSMILES?: string;
  CanonicalSMILES?: string;
  InChI?: string;
  InChIKey?: string;
}

async function fetchProperties(cid: number): Promise<PubChemProps | null> {
  const url = `${PUBCHEM_BASE}/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight,IsomericSMILES,CanonicalSMILES,InChI,InChIKey/JSON`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { PropertyTable?: { Properties?: PubChemProps[] } };
  return data?.PropertyTable?.Properties?.[0] ?? null;
}

async function fetchSynonyms(cid: number): Promise<string[]> {
  const url = `${PUBCHEM_BASE}/compound/cid/${cid}/synonyms/JSON`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return [];
  const data = await res.json() as { InformationList?: { Information?: Array<{ Synonym?: string[] }> } };
  return data?.InformationList?.Information?.[0]?.Synonym ?? [];
}

async function fetchDescription(cid: number): Promise<{ description: string; pharmacology: string }> {
  const url = `${PUBCHEM_BASE}/compound/cid/${cid}/description/JSON`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return { description: "", pharmacology: "" };
  const data = await res.json() as {
    InformationList?: {
      Information?: Array<{
        Description?: string;
        Title?: string;
      }>;
    };
  };
  const infos = data?.InformationList?.Information ?? [];
  const desc = infos.find((i) => i.Description && !i.Title?.toLowerCase().includes("pharmacology"))?.Description ?? "";
  const pharm = infos.find((i) => i.Title?.toLowerCase().includes("pharmacology"))?.Description ?? "";
  return { description: desc, pharmacology: pharm };
}
