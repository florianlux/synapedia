/**
 * gen-masterlist.ts
 *
 * Robust Wikidata importer with adaptive batching + checkpointing.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { slugify } from "./lib/slugify.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT =
  "synapedia-import/1.1 (github actions; https://github.com/florianlux/synapedia)";

const MAX_RETRIES = 6;
const REQUEST_TIMEOUT_MS = 60_000;
const BATCH_DELAY_MS = 800;
const MIN_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SCRIPT_DIR =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(url.fileURLToPath(import.meta.url));

const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const SEEDS_DIR = path.join(ROOT_DIR, "seeds");
const OUTPUT_FILE = path.join(SEEDS_DIR, "substances.masterlist.json");

// ---------------------------------------------------------------------------
// Types
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
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt: number) {
  const base = Math.min(60_000, 1000 * Math.pow(2, attempt - 1));
  return base + Math.floor(Math.random() * 800);
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const sec = Number(value);
  if (Number.isFinite(sec)) return Math.min(sec * 1000, 60_000);
  return null;
}

// ---------------------------------------------------------------------------
// SPARQL Query
// ---------------------------------------------------------------------------

function buildQuery(limit: number, offset: number): string {
  return `
SELECT DISTINCT ?item ?itemLabel ?itemAltLabel WHERE {
  ?item wdt:P31/wdt:P279* wd:Q8386 .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}
ORDER BY ?itemLabel
LIMIT ${limit}
OFFSET ${offset}
`.trim();
}

// ---------------------------------------------------------------------------
// Robust Fetch (POST + Retry + Timeout)
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
        const retryAfter = parseRetryAfterMs(res.headers.get("retry-after"));
        if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
          const wait = retryAfter ?? backoffMs(attempt);
          console.warn(
            `[gen-masterlist] ${res.status} received. Waiting ${wait}ms before retry…`
          );
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
        console.warn(`[gen-masterlist] Retrying in ${wait}ms…`);
        await sleep(wait);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("SPARQL fetch failed");
}

// ---------------------------------------------------------------------------
// Parse Results
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
// Fallback
// ---------------------------------------------------------------------------

function fallbackEntries(limit: number): MasterlistEntry[] {
  const base = ["Amphetamin", "Methamphetamin", "MDMA", "LSD", "Psilocybin"];
  return base.slice(0, limit).map((t) => ({
    title: t,
    slug: slugify(t),
    aliases: [],
    tags: [],
    risk: "Unbekannt",
    evidence: "Unbekannt",
  }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 200;

  console.log(`[gen-masterlist] Fetching up to ${limit} substances…`);

  const allEntries = new Map<string, MasterlistEntry>();
  let offset = 0;
  let batchSize = MAX_BATCH_SIZE;

  try {
    while (allEntries.size < limit) {
      const requestSize = Math.min(batchSize, limit - allEntries.size);
      console.log(
        `[gen-masterlist] offset=${offset}, batchSize=${requestSize}`
      );

      try {
        const response = await fetchSparql(buildQuery(requestSize, offset));
        const bindings = response.results.bindings;

        if (!bindings.length) break;

        const batchEntries = parseBindings(bindings);
        for (const [slug, entry] of batchEntries) {
          if (!allEntries.has(slug)) allEntries.set(slug, entry);
        }

        offset += requestSize;

        // checkpoint
        const checkpoint = Array.from(allEntries.values()).slice(0, limit);
        fs.mkdirSync(SEEDS_DIR, { recursive: true });
        fs.writeFileSync(
          OUTPUT_FILE,
          JSON.stringify(checkpoint, null, 2) + "\n"
        );
        console.log(
          `[gen-masterlist] checkpoint saved (${checkpoint.length})`
        );

        if (bindings.length < requestSize) break;

        await sleep(BATCH_DELAY_MS);

        // gradually increase again if stable
        if (batchSize < MAX_BATCH_SIZE)
          batchSize = Math.min(MAX_BATCH_SIZE, batchSize + 5);
      } catch (err) {
        if (batchSize > MIN_BATCH_SIZE) {
          batchSize = Math.max(MIN_BATCH_SIZE, Math.floor(batchSize / 2));
          console.warn(
            `[gen-masterlist] reducing batch size → ${batchSize}`
          );
          continue;
        }
        throw err;
      }
    }
  } catch (err: any) {
    console.error(`[gen-masterlist] WDQS failed: ${err.message}`);
    console.warn(`[gen-masterlist] Writing fallback.`);
    const fallback = fallbackEntries(limit);
    fs.mkdirSync(SEEDS_DIR, { recursive: true });
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(fallback, null, 2) + "\n"
    );
    return;
  }

  console.log(
    `[gen-masterlist] Done. Collected ${allEntries.size} entries.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
