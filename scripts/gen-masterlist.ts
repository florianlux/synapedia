/**
 * gen-masterlist.ts
 *
 * Generates seeds/substances.masterlist.json with substance entries
 * sourced from Wikidata SPARQL. Deduplicates by slug.
 *
 * Usage:
 *   npx tsx scripts/gen-masterlist.ts --limit 1000
 *
 * Synapedia is a scientific education platform — no consumption guides,
 * no dosage tables, no procurement hints. Only neutral metadata is imported.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { slugify } from "./lib/slugify.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SPARQL_ENDPOINT_PRIMARY = "https://query.wikidata.org/sparql";
const SPARQL_ENDPOINT_FALLBACK =
  "https://wikidata-query.wikidata.org/bigdata/namespace/wdq/sparql";

const USER_AGENT = "synapedia-import/1.0 (github actions; https://github.com/florianlux/synapedia)";
const MAX_RETRIES = 6;
const REQUEST_TIMEOUT_MS = 60_000; // 60s — generous timeout for WDQS latency spikes
const BATCH_DELAY_MS = 800; // polite delay between batches
const RETRY_AFTER_CAP_S = 60; // max seconds we'll honour from Retry-After header
const BASE_BATCH_SIZE = 50;
const MIN_BATCH_SIZE = 10;

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

interface SparqlBinding {
  item: { value: string };
  itemLabel: { value: string };
  itemAltLabel?: { value: string };
  classLabel?: { value: string };
}

interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

// ---------------------------------------------------------------------------
// Tag inference from Wikidata class labels
// ---------------------------------------------------------------------------

const TAG_KEYWORDS: Record<string, string[]> = {
  stimulant: ["stimulant", "stimulans", "amphetamine", "amphetamin"],
  opioid: ["opioid", "opiate", "opiat"],
  benzodiazepine: ["benzodiazepine", "benzodiazepin"],
  psychedelic: ["psychedelic", "psychedelik", "hallucinogen", "halluzinogen", "tryptamine", "tryptamin", "lysergamide"],
  dissociative: ["dissociative", "dissociativ", "arylcyclohexylamine"],
  cannabinoid: ["cannabinoid"],
  depressant: ["depressant", "sedative", "sedativum", "barbiturate", "barbiturat"],
  deliriant: ["deliriant", "anticholinergic", "anticholinergikum"],
  nps: ["new psychoactive", "neue psychoaktive", "designer drug", "research chemical"],
};

function inferTags(classLabels: string[]): string[] {
  const tags = new Set<string>();
  const combined = classLabels.join(" ").toLowerCase();
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        tags.add(tag);
        break;
      }
    }
  }
  return Array.from(tags);
}

// ---------------------------------------------------------------------------
// SPARQL Query — fetch psychoactive substances with class info
// ---------------------------------------------------------------------------

function buildQuery(limit: number, offset: number): string {
  return `
SELECT DISTINCT ?item ?itemLabel ?itemAltLabel ?classLabel WHERE {
  {
    ?item wdt:P31/wdt:P279* wd:Q8386 .
  } UNION {
    ?item wdt:P31 wd:Q207011 .
  } UNION {
    ?item wdt:P31/wdt:P279* wd:Q11173 .
    ?item wdt:P31 wd:Q207011 .
  }
  OPTIONAL {
    ?item wdt:P31 ?class .
    ?class rdfs:label ?classLabel .
    FILTER(LANG(?classLabel) = "en")
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
}
ORDER BY ?itemLabel
LIMIT ${limit}
OFFSET ${offset}
`.trim();
}

// ---------------------------------------------------------------------------
// Fetch with retries, backoff, timeout, endpoint fallback
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function backoffMs(attempt: number): number {
  // exponential backoff + jitter
  const base = Math.min(20_000, 2_000 * Math.pow(2, attempt - 1)); // 2s,4s,8s,16s,20s...
  const jitter = Math.floor(Math.random() * 600);
  return base + jitter;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (!isNaN(seconds) && seconds > 0) {
    return Math.min(seconds, RETRY_AFTER_CAP_S) * 1_000;
  }
  // Retry-After can also be an HTTP-date; ignore those and fall back to backoff
  return undefined;
}

async function fetchSparqlFromEndpoint(endpoint: string, query: string): Promise<SparqlResponse> {
  const body = new URLSearchParams({ query });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/sparql-results+json",
        "User-Agent": USER_AGENT,
      },
      body: body.toString(),
      signal: controller.signal,
    });

    if (!res.ok) {
      const retryAfter = parseRetryAfter(res.headers.get("Retry-After"));
      const text = await res.text().catch(() => "");
      throw Object.assign(new Error(`SPARQL error ${res.status}: ${text.slice(0, 300)}`), {
        status: res.status,
        retryAfterMs: retryAfter,
      });
    }

    return (await res.json()) as SparqlResponse;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSparql(query: string): Promise<SparqlResponse> {
  let lastError: unknown;

  // try primary, then fallback (within retry loop)
  const endpoints = [SPARQL_ENDPOINT_PRIMARY, SPARQL_ENDPOINT_FALLBACK];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // after a few failures, start trying fallback as well
    const tryBoth = attempt >= 3;
    const toTry = tryBoth ? endpoints : [SPARQL_ENDPOINT_PRIMARY];

    let retryAfterMs: number | undefined;

    for (const endpoint of toTry) {
      try {
        return await fetchSparqlFromEndpoint(endpoint, query);
      } catch (err: any) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const status = typeof err?.status === "number" ? err.status : undefined;

        // Capture Retry-After from 429/503 errors
        if ((status === 429 || status === 503) && typeof err?.retryAfterMs === "number") {
          retryAfterMs = err.retryAfterMs;
        }

        const retryable = status ? isRetryableStatus(status) : msg.toLowerCase().includes("abort");
        console.warn(
          `[gen-masterlist] Attempt ${attempt}/${MAX_RETRIES} failed on ${endpoint}: ${msg}`
        );

        if (!retryable) {
          // Non-retryable errors should fail fast
          throw err instanceof Error ? err : new Error(String(err));
        }
      }
    }

    if (attempt < MAX_RETRIES) {
      const wait = retryAfterMs ?? backoffMs(attempt);
      console.warn(`[gen-masterlist] Retrying in ${wait}ms${retryAfterMs ? " (Retry-After)" : " (backoff)"}…`);
      await sleep(wait);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "SPARQL fetch failed"));
}

// ---------------------------------------------------------------------------
// Parse SPARQL results into masterlist entries
// ---------------------------------------------------------------------------

function parseBindings(bindings: SparqlBinding[]): Map<string, MasterlistEntry> {
  // Group by QID to accumulate multiple class labels
  const grouped = new Map<string, { binding: SparqlBinding; classLabels: string[] }>();

  for (const b of bindings) {
    const qid = b.item.value.replace("http://www.wikidata.org/entity/", "");
    const existing = grouped.get(qid);
    if (existing) {
      if (b.classLabel?.value) existing.classLabels.push(b.classLabel.value);
    } else {
      grouped.set(qid, {
        binding: b,
        classLabels: b.classLabel?.value ? [b.classLabel.value] : [],
      });
    }
  }

  const entries = new Map<string, MasterlistEntry>();

  for (const { binding, classLabels } of grouped.values()) {
    const label = binding.itemLabel?.value ?? "";
    if (!label || label.startsWith("Q")) continue;

    const slug = slugify(label);
    if (!slug) continue;
    if (entries.has(slug)) continue;

    const aliases: string[] = [];
    if (binding.itemAltLabel?.value) {
      for (const a of binding.itemAltLabel.value.split(",")) {
        const trimmed = a.trim();
        if (trimmed && trimmed !== label) aliases.push(trimmed);
      }
    }

    entries.set(slug, {
      title: label,
      slug,
      aliases,
      tags: inferTags(classLabels),
      risk: "Unbekannt",
      evidence: "Unbekannt",
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Fallback seed list (only used if WDQS is down repeatedly)
// ---------------------------------------------------------------------------

function fallbackEntries(limit: number): MasterlistEntry[] {
  const base = [
    "Amphetamin",
    "Methamphetamin",
    "MDMA",
    "LSD",
    "Psilocybin",
    "Ketamin",
    "Kokain",
    "Heroin",
    "Morphin",
    "Fentanyl",
    "THC",
    "CBD",
    "Diazepam",
    "Lorazepam",
    "Alprazolam",
    "Clonazepam",
    "GHB",
    "GBL",
    "2C-B",
    "DMT",
    "Mescalin",
    "Salvinorin A",
    "Ibogaine",
    "Buprenorphin",
    "Oxycodon",
  ];

  const out: MasterlistEntry[] = [];
  for (const t of base.slice(0, Math.max(1, Math.min(limit, base.length)))) {
    out.push({
      title: t,
      slug: slugify(t),
      aliases: [],
      tags: [],
      risk: "Unbekannt",
      evidence: "Unbekannt",
    });
  }
  return out.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Checkpoint: write accumulated entries to disk
// ---------------------------------------------------------------------------

function checkpoint(entries: Map<string, MasterlistEntry>): void {
  const arr = Array.from(entries.values());
  fs.mkdirSync(SEEDS_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(arr, null, 2) + "\n");
  console.log(`[gen-masterlist] ✓ Checkpoint saved: ${arr.length} entries → ${OUTPUT_FILE}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 1000;

  if (isNaN(limit) || limit < 1) {
    console.error("[gen-masterlist] Invalid --limit value");
    process.exit(1);
  }

  console.log(`[gen-masterlist] Fetching up to ${limit} substances from Wikidata SPARQL…`);
  console.log(`[gen-masterlist] Primary endpoint: ${SPARQL_ENDPOINT_PRIMARY}`);
  console.log(`[gen-masterlist] Fallback endpoint: ${SPARQL_ENDPOINT_FALLBACK}`);

  const allEntries = new Map<string, MasterlistEntry>();
  let offset = 0;
  let batchSize = BASE_BATCH_SIZE;

  console.log(`[gen-masterlist] Initial batch size=${batchSize}, min=${MIN_BATCH_SIZE}.`);

  while (allEntries.size < limit) {
    const remaining = limit - allEntries.size;

    // overfetch slightly to compensate for dedup, but keep it small
    const batchLimit = Math.min(batchSize, remaining + Math.min(15, Math.ceil(remaining / 2)));

    console.log(`[gen-masterlist]   batch offset=${offset}, request size=${batchLimit}, batch size=${batchSize}…`);

    let response: SparqlResponse | undefined;
    try {
      response = await fetchSparql(buildQuery(batchLimit, offset));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[gen-masterlist] Batch failed (size=${batchSize}): ${msg}`);

      // Adaptive: halve batch size and retry same offset
      if (batchSize > MIN_BATCH_SIZE) {
        batchSize = Math.max(MIN_BATCH_SIZE, Math.floor(batchSize / 2));
        console.warn(`[gen-masterlist] ↓ Reducing batch size to ${batchSize} and retrying same offset…`);
        continue; // retry same offset with smaller batch
      }

      // Min batch size still fails — fall back
      console.error("[gen-masterlist] Min batch size exhausted. Writing fallback masterlist so pipeline can proceed.");
      if (allEntries.size > 0) {
        // We have partial data — use it instead of the hardcoded fallback
        checkpoint(allEntries);
        console.log(`[gen-masterlist] Wrote partial results: ${allEntries.size} entries.`);
      } else {
        const fallback = fallbackEntries(limit);
        fs.mkdirSync(SEEDS_DIR, { recursive: true });
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fallback, null, 2) + "\n");
        console.log(`[gen-masterlist] Wrote fallback ${OUTPUT_FILE} (${fallback.length} entries)`);
      }
      return;
    }

    const bindings = response.results.bindings;

    if (bindings.length === 0) {
      console.log("[gen-masterlist]   no more results. Done fetching.");
      break;
    }

    const batchEntries = parseBindings(bindings);
    for (const [slug, entry] of batchEntries) {
      if (allEntries.size >= limit) break;
      if (!allEntries.has(slug)) allEntries.set(slug, entry);
    }

    offset += batchLimit;

    // Progressive checkpoint after each successful batch
    checkpoint(allEntries);

    // If we got fewer bindings than requested, we likely reached the end
    if (bindings.length < batchLimit) break;

    if (allEntries.size < limit) await sleep(BATCH_DELAY_MS);
  }

  const result = Array.from(allEntries.values()).slice(0, limit);
  console.log(`[gen-masterlist] Collected ${result.length} unique entries (limit=${limit}).`);

  fs.mkdirSync(SEEDS_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2) + "\n");
  console.log(`[gen-masterlist] Wrote ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("[gen-masterlist] Fatal error:", err);
  process.exit(1);
});
