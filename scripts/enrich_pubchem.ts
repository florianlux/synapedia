/**
 * Enrich substances with data from PubChem PUG REST API.
 *
 * For each PubChem CID, fetches:
 *   - Synonyms (names/aliases)
 *   - Basic molecular properties (formula, weight, SMILES)
 *
 * Rate-limited to max 3 req/sec with exponential backoff on errors.
 * Per-CID results are cached in .cache/pubchem/<cid>.json (gitignored).
 *
 * Usage:
 *   npx tsx scripts/enrich_pubchem.ts [--force] [--max 100]
 *
 * Expects .cache/wikidata_substances.json to exist (run fetch_wikidata_list.ts first).
 *
 * Synapedia is a scientific education platform — no consumption guides,
 * no dosage tables, no procurement hints. Only neutral metadata is imported.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid";

/** Max requests per second (PubChem recommends ≤5/sec for anonymous use) */
const MAX_RPS = 3;
const MIN_INTERVAL_MS = Math.ceil(1000 / MAX_RPS);

/** Max retries per CID */
const MAX_RETRIES = 3;

/** Base backoff in ms for exponential backoff */
const BASE_BACKOFF_MS = 1000;

const SCRIPT_DIR =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(url.fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const CACHE_DIR = path.join(ROOT_DIR, ".cache");
const PUBCHEM_CACHE_DIR = path.join(CACHE_DIR, "pubchem");
const WIKIDATA_CACHE = path.join(CACHE_DIR, "wikidata_substances.json");
const OUTPUT_FILE = path.join(CACHE_DIR, "pubchem_enriched.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PubChemEnrichment {
  cid: number;
  synonyms: string[];
  molecular_formula?: string;
  molecular_weight?: number;
  isomeric_smiles?: string;
}

interface WikidataCacheFile {
  fetched_at: string;
  count: number;
  items: { qid: string; pubchem_cid: number; label: string; description: string }[];
}

interface PubChemSynonymsResponse {
  InformationList?: {
    Information?: { CID: number; Synonym?: string[] }[];
  };
}

interface PubChemPropertyResponse {
  PropertyTable?: {
    Properties?: {
      CID: number;
      MolecularFormula?: string;
      MolecularWeight?: number;
      IsomericSMILES?: string;
    }[];
  };
}

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

let lastRequestTime = 0;

async function rateLimitedFetch(fetchUrl: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(fetchUrl, {
    headers: { Accept: "application/json" },
  });
}

async function fetchWithRetry(fetchUrl: string): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await rateLimitedFetch(fetchUrl);
      if (res.status === 429 || res.status >= 500) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`  [pubchem] ${res.status} — retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) throw err;
      const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(`  [pubchem] Network error — retrying in ${backoff}ms`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw new Error("Max retries exceeded");
}

// ---------------------------------------------------------------------------
// Per-CID cache
// ---------------------------------------------------------------------------

function getCidCachePath(cid: number): string {
  return path.join(PUBCHEM_CACHE_DIR, `${cid}.json`);
}

function readCidCache(cid: number): PubChemEnrichment | null {
  const p = getCidCachePath(cid);
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as PubChemEnrichment;
  } catch {
    return null;
  }
}

function writeCidCache(cid: number, data: PubChemEnrichment): void {
  fs.mkdirSync(PUBCHEM_CACHE_DIR, { recursive: true });
  fs.writeFileSync(getCidCachePath(cid), JSON.stringify(data, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// PubChem API calls
// ---------------------------------------------------------------------------

async function fetchSynonyms(cid: number): Promise<string[]> {
  const fetchUrl = `${PUBCHEM_BASE}/${cid}/synonyms/JSON`;
  const res = await fetchWithRetry(fetchUrl);
  if (res.status === 404) return [];
  if (!res.ok) {
    console.warn(`  [pubchem] synonyms for CID ${cid}: HTTP ${res.status}`);
    return [];
  }
  const data = (await res.json()) as PubChemSynonymsResponse;
  return data.InformationList?.Information?.[0]?.Synonym ?? [];
}

async function fetchProperties(cid: number): Promise<Partial<PubChemEnrichment>> {
  const fetchUrl = `${PUBCHEM_BASE}/${cid}/property/MolecularFormula,MolecularWeight,IsomericSMILES/JSON`;
  const res = await fetchWithRetry(fetchUrl);
  if (res.status === 404) return {};
  if (!res.ok) {
    console.warn(`  [pubchem] properties for CID ${cid}: HTTP ${res.status}`);
    return {};
  }
  const data = (await res.json()) as PubChemPropertyResponse;
  const props = data.PropertyTable?.Properties?.[0];
  if (!props) return {};
  return {
    molecular_formula: props.MolecularFormula,
    molecular_weight: props.MolecularWeight,
    isomeric_smiles: props.IsomericSMILES,
  };
}

// ---------------------------------------------------------------------------
// Main enrichment
// ---------------------------------------------------------------------------

async function enrichCid(cid: number, force: boolean): Promise<PubChemEnrichment> {
  if (!force) {
    const cached = readCidCache(cid);
    if (cached) return cached;
  }

  const [synonyms, props] = await Promise.all([
    fetchSynonyms(cid),
    fetchProperties(cid),
  ]);

  const enrichment: PubChemEnrichment = {
    cid,
    synonyms: synonyms.slice(0, 50), // cap at 50 synonyms
    ...props,
  };

  writeCidCache(cid, enrichment);
  return enrichment;
}

export async function enrichPubChem(opts: {
  force?: boolean;
  max?: number;
} = {}): Promise<PubChemEnrichment[]> {
  // Load Wikidata cache
  if (!fs.existsSync(WIKIDATA_CACHE)) {
    console.error("[pubchem] Wikidata cache not found. Run fetch_wikidata_list.ts first.");
    process.exit(1);
  }

  const wikidataRaw = fs.readFileSync(WIKIDATA_CACHE, "utf-8");
  const wikidataData: WikidataCacheFile = JSON.parse(wikidataRaw);
  let items = wikidataData.items;

  if (opts.max && opts.max > 0) {
    items = items.slice(0, opts.max);
  }

  console.log(`[pubchem] Enriching ${items.length} substances from PubChem…`);

  const results: PubChemEnrichment[] = [];
  let cached = 0;
  let fetched = 0;
  let errors = 0;

  for (let i = 0; i < items.length; i++) {
    const { pubchem_cid, label } = items[i];
    try {
      const wasCached = !opts.force && readCidCache(pubchem_cid) !== null;
      const enrichment = await enrichCid(pubchem_cid, !!opts.force);
      results.push(enrichment);

      if (wasCached) {
        cached++;
      } else {
        fetched++;
      }

      if ((i + 1) % 50 === 0 || i === items.length - 1) {
        console.log(`[pubchem]   progress: ${i + 1}/${items.length} (fetched=${fetched}, cached=${cached}, errors=${errors})`);
      }
    } catch (err) {
      errors++;
      console.error(`[pubchem]   error for CID ${pubchem_cid} (${label}):`, err instanceof Error ? err.message : err);
    }
  }

  // Write combined output
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    enriched_at: new Date().toISOString(),
    count: results.length,
    items: results,
  }, null, 2) + "\n");

  console.log(`[pubchem] Done. Enriched ${results.length} substances (${fetched} fetched, ${cached} from cache, ${errors} errors).`);
  console.log(`[pubchem] Output: ${OUTPUT_FILE}`);

  return results;
}

// CLI entry point
const isDirectRun =
  typeof require !== "undefined"
    ? require.main === module
    : process.argv[1] && import.meta.url === url.pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const maxIdx = args.indexOf("--max");
  const max = maxIdx >= 0 ? parseInt(args[maxIdx + 1], 10) : undefined;

  enrichPubChem({ force, max }).catch((err) => {
    console.error("[pubchem] Fatal error:", err);
    process.exit(1);
  });
}
