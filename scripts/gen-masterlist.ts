/**
 * gen-masterlist.ts
 *
 * Stable psychoactive substance importer for Synapedia.
 * Optimized for GitHub Actions + WDQS rate limits.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { slugify } from "./lib/slugify.js";

// ---------------------------------------------------------------------------
// CONFIG – Conservative for WDQS stability
// ---------------------------------------------------------------------------

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

const USER_AGENT =
  "synapedia-import/3.0 (github actions; https://github.com/florianlux/synapedia)";

const MAX_RETRIES = 6;
const REQUEST_TIMEOUT_MS = 90_000;   // 90s
const BATCH_DELAY_MS = 2000;         // 2s between batches
const MIN_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 15;           // Conservative

// ---------------------------------------------------------------------------
// PATHS
// ---------------------------------------------------------------------------

const SCRIPT_DIR =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(url.fileURLToPath(import.meta.url));

const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const SEEDS_DIR = path.join(ROOT_DIR, "seeds");
const OUTPUT_FILE = path.join(SEEDS_DIR, "substances.masterlist.json");

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface MasterlistEntry {
  title: string;
  slug: string;
  aliases: string[];
  tags: string[];
  risk: string;
  evidence: string;
}

interface SparqlResponse {
  results: { bindings: any[] };
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt: number) {
  return Math.min(90_000, 3000 * Math.pow(2, attempt - 1));
}

// ---------------------------------------------------------------------------
// HIGH PRECISION QUERY – Only psychoactive classes
// ---------------------------------------------------------------------------

function buildQuery(limit: number, offset: number): string {
  return `
SELECT DISTINCT ?item ?itemLabel ?itemAltLabel WHERE {

  VALUES ?class {
    wd:Q204082     # psychoactive drug
    wd:Q207011     # recreational drug
    wd:Q189092     # hallucinogen
    wd:Q12029      # stimulant
    wd:Q205989     # depressant
    wd:Q11254      # opioid
    wd:Q409199     # benzodiazepine
    wd:Q4164871    # dissociative
    wd:Q40050      # cannabinoid
  }

  ?item wdt:P31/wdt:P279* ?class .

  FILTER NOT EXISTS { ?item wdt:P31 wd:Q16521 }   # taxon
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q8054 }    # protein
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q12140 }   # pharmaceutical brand
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q28885102 }# medical device

  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}
ORDER BY ?itemLabel
LIMIT ${limit}
OFFSET ${offset}
`.trim();
}

// ---------------------------------------------------------------------------
// ROBUST FETCH (POST + Retry)
// ---------------------------------------------------------------------------

async function fetchSparql(query: string): Promise<SparqlResponse> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const body = new URLSearchParams({ query, format: "json" });

      const res = await fetch(SPARQL_ENDPOINT, {
        method: "POST",
        body,
        signal: controller.signal,
        headers: {
          Accept: "application/sparql-results+json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
      });

      if (!res.ok) {
        if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
          const wait = backoffMs(attempt);
          console.warn(`[gen-masterlist] ${res.status} – retrying in ${wait}ms`);
          await sleep(wait);
          continue;
        }

        throw new Error(`SPARQL error ${res.status}`);
      }

      return (await res.json()) as SparqlResponse;
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[gen-masterlist] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`
      );

      if (attempt < MAX_RETRIES) {
        const wait = backoffMs(attempt);
        console.warn(`[gen-masterlist] Retrying in ${wait}ms`);
        await sleep(wait);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("SPARQL fetch failed");
}

// ---------------------------------------------------------------------------
// PARSE RESULTS
// ---------------------------------------------------------------------------

function parseBindings(bindings: any[]): Map<string, MasterlistEntry> {
  const entries = new Map<string, MasterlistEntry>();

  for (const b of bindings) {
    const label = b.itemLabel?.value;
    if (!label || label.startsWith("Q")) continue;

    const slug = slugify(label);
    if (!slug || entries.has(slug)) continue;

    const aliases =
      b.itemAltLabel?.value?.split(",").map((a: string) => a.trim()) ?? [];

    entries.set(slug, {
      title: label,
      slug,
      aliases,
      tags: [],
      risk: "Unbekannt",
      evidence: "Unbekannt",
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 100;

  console.log(`[gen-masterlist] Fetching up to ${limit} psychoactive substances`);

  const allEntries = new Map<string, MasterlistEntry>();
  let offset = 0;
  let batchSize = MAX_BATCH_SIZE;

  while (allEntries.size < limit) {
    const requestSize = Math.min(batchSize, limit - allEntries.size);

    console.log(`[gen-masterlist] offset=${offset}, batchSize=${requestSize}`);

    try {
      const response = await fetchSparql(buildQuery(requestSize, offset));
      const bindings = response.results.bindings;

      if (!bindings.length) break;

      const batchEntries = parseBindings(bindings);

      for (const [slug, entry] of batchEntries) {
        if (!allEntries.has(slug)) {
          allEntries.set(slug, entry);
        }
      }

      offset += requestSize;

      const checkpoint = Array.from(allEntries.values()).slice(0, limit);
      fs.mkdirSync(SEEDS_DIR, { recursive: true });
      fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(checkpoint, null, 2) + "\n"
      );

      await sleep(BATCH_DELAY_MS);
    } catch (err: any) {
      console.warn(`[gen-masterlist] error: ${err.message}`);

      if (batchSize > MIN_BATCH_SIZE) {
        batchSize = Math.max(MIN_BATCH_SIZE, Math.floor(batchSize / 2));
        console.warn(`[gen-masterlist] reducing batch size → ${batchSize}`);
      } else {
        console.error("[gen-masterlist] minimal batch size reached — stopping");
        break;
      }
    }
  }

  console.log(`[gen-masterlist] Done. Collected ${allEntries.size} entries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
