/**
 * Fetch a list of psychoactive substances from Wikidata via SPARQL.
 *
 * For each item the query returns:
 *   - Wikidata QID
 *   - PubChem CID (P662)
 *   - English label + description
 *
 * Results are cached in .cache/wikidata_substances.json (gitignored).
 *
 * Usage:
 *   npx tsx scripts/fetch_wikidata_list.ts [--force] [--limit 500]
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

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "SynapediaBot/1.0 (https://github.com/florianlux/synapedia)";

/** Maximum items per SPARQL request (Wikidata has a soft limit around 10 000) */
const DEFAULT_LIMIT = 1000;

/** Delay between SPARQL batches in ms (be polite to Wikidata) */
const BATCH_DELAY_MS = 1000;

/** Cache validity — 7 days */
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const SCRIPT_DIR =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(url.fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const CACHE_DIR = path.join(ROOT_DIR, ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "wikidata_substances.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WikidataSubstance {
  qid: string;
  pubchem_cid: number;
  label: string;
  description: string;
}

interface SparqlBinding {
  item: { value: string };
  pubchemCID: { value: string };
  itemLabel: { value: string };
  itemDescription?: { value: string };
}

interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

interface CacheFile {
  fetched_at: string;
  count: number;
  items: WikidataSubstance[];
}

// ---------------------------------------------------------------------------
// SPARQL Query
// ---------------------------------------------------------------------------

function buildQuery(limit: number, offset: number): string {
  // Query items that are:
  //   - instance of (P31) or subclass of (P279) "drug" (Q8386) OR
  //   - instance of "psychoactive drug" (Q207011) OR
  //   - instance of "chemical compound" (Q11173)
  //   AND have a PubChem CID (P662)
  return `
SELECT DISTINCT ?item ?pubchemCID ?itemLabel ?itemDescription WHERE {
  {
    ?item wdt:P31/wdt:P279* wd:Q8386 .
  } UNION {
    ?item wdt:P31 wd:Q207011 .
  } UNION {
    ?item wdt:P31/wdt:P279* wd:Q11173 .
    ?item wdt:P31 wd:Q207011 .
  }
  ?item wdt:P662 ?pubchemCID .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de" . }
}
ORDER BY ?itemLabel
LIMIT ${limit}
OFFSET ${offset}
`.trim();
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchSparql(query: string): Promise<SparqlResponse> {
  const params = new URLSearchParams({ query, format: "json" });
  const res = await fetch(`${SPARQL_ENDPOINT}?${params.toString()}`, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Wikidata SPARQL error ${res.status}: ${text.slice(0, 300)}`);
  }

  return (await res.json()) as SparqlResponse;
}

function parseBindings(bindings: SparqlBinding[]): WikidataSubstance[] {
  const seen = new Set<string>();
  const items: WikidataSubstance[] = [];

  for (const b of bindings) {
    const qid = b.item.value.replace("http://www.wikidata.org/entity/", "");
    const cidRaw = parseInt(b.pubchemCID.value, 10);
    if (!qid || isNaN(cidRaw)) continue;
    if (seen.has(qid)) continue;
    seen.add(qid);

    items.push({
      qid,
      pubchem_cid: cidRaw,
      label: b.itemLabel?.value ?? "",
      description: b.itemDescription?.value ?? "",
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

function isCacheFresh(): boolean {
  try {
    if (!fs.existsSync(CACHE_FILE)) return false;
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const data: CacheFile = JSON.parse(raw);
    if (!data.fetched_at || !data.items?.length) return false;
    return Date.now() - new Date(data.fetched_at).getTime() < CACHE_MAX_AGE_MS;
  } catch {
    return false;
  }
}

function readCache(): WikidataSubstance[] {
  const raw = fs.readFileSync(CACHE_FILE, "utf-8");
  const data: CacheFile = JSON.parse(raw);
  return data.items;
}

function writeCache(items: WikidataSubstance[]): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const data: CacheFile = {
    fetched_at: new Date().toISOString(),
    count: items.length,
    items,
  };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function fetchWikidataList(opts: {
  force?: boolean;
  limit?: number;
} = {}): Promise<WikidataSubstance[]> {
  const limit = opts.limit ?? DEFAULT_LIMIT;

  if (!opts.force && isCacheFresh()) {
    const cached = readCache();
    console.log(`[wikidata] Using cached list (${cached.length} items). Use --force to refresh.`);
    return cached;
  }

  console.log(`[wikidata] Fetching substances from Wikidata SPARQL (limit=${limit})…`);

  const allItems: WikidataSubstance[] = [];
  let offset = 0;
  const batchSize = Math.min(limit, 1000);

  while (offset < limit) {
    const currentBatch = Math.min(batchSize, limit - offset);
    console.log(`[wikidata]   batch offset=${offset}, size=${currentBatch}…`);

    const query = buildQuery(currentBatch, offset);
    const response = await fetchSparql(query);
    const items = parseBindings(response.results.bindings);

    if (items.length === 0) {
      console.log(`[wikidata]   no more results at offset=${offset}. Done.`);
      break;
    }

    allItems.push(...items);
    offset += currentBatch;

    // If we got fewer results than requested, we've exhausted the query
    if (response.results.bindings.length < currentBatch) {
      break;
    }

    // Be polite: small delay between batches
    if (offset < limit) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // Deduplicate by QID
  const deduped = new Map<string, WikidataSubstance>();
  for (const item of allItems) {
    if (!deduped.has(item.qid)) {
      deduped.set(item.qid, item);
    }
  }
  const result = Array.from(deduped.values());

  console.log(`[wikidata] Fetched ${result.length} unique substances.`);
  writeCache(result);
  console.log(`[wikidata] Cached to ${CACHE_FILE}`);

  return result;
}

// CLI entry point
const isDirectRun =
  typeof require !== "undefined"
    ? require.main === module
    : process.argv[1] && import.meta.url === url.pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : undefined;

  fetchWikidataList({ force, limit }).catch((err) => {
    console.error("[wikidata] Fatal error:", err);
    process.exit(1);
  });
}
