/**
 * gen-masterlist.ts
 *
 * Generates seeds/substances.masterlist.json with ~1000 substance entries
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

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "SynapediaBot/1.0 (https://github.com/florianlux/synapedia)";
const MAX_RETRIES = 3;
const BATCH_SIZE = 500;
const BATCH_DELAY_MS = 2000;

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
// Fetch with retries
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchSparql(query: string): Promise<SparqlResponse> {
  const params = new URLSearchParams({ query, format: "json" });
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${SPARQL_ENDPOINT}?${params.toString()}`, {
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": USER_AGENT,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`SPARQL error ${res.status}: ${text.slice(0, 300)}`);
      }

      return (await res.json()) as SparqlResponse;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[gen-masterlist] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);
      if (attempt < MAX_RETRIES) {
        const backoff = attempt * 2000;
        console.warn(`[gen-masterlist] Retrying in ${backoff}ms…`);
        await sleep(backoff);
      }
    }
  }

  throw lastError ?? new Error("SPARQL fetch failed after retries");
}

// ---------------------------------------------------------------------------
// Parse SPARQL results into masterlist entries
// ---------------------------------------------------------------------------

function parseBindings(bindings: SparqlBinding[]): Map<string, MasterlistEntry> {
  /** Group by Wikidata QID so we can collect multiple class labels */
  const grouped = new Map<string, { binding: SparqlBinding; classLabels: string[] }>();

  for (const b of bindings) {
    const qid = b.item.value.replace("http://www.wikidata.org/entity/", "");
    const existing = grouped.get(qid);
    if (existing) {
      if (b.classLabel?.value) {
        existing.classLabels.push(b.classLabel.value);
      }
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
    if (!label || label.startsWith("Q")) continue; // skip if no label resolved

    const slug = slugify(label);
    if (!slug) continue;
    if (entries.has(slug)) continue; // deduplicate by slug

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

  const allEntries = new Map<string, MasterlistEntry>();
  let offset = 0;

  while (allEntries.size < limit) {
    const batchLimit = Math.min(BATCH_SIZE, limit - allEntries.size + 200); // over-fetch to compensate dedup
    console.log(`[gen-masterlist]   batch offset=${offset}, request size=${batchLimit}…`);

    const response = await fetchSparql(buildQuery(batchLimit, offset));
    const batchEntries = parseBindings(response.results.bindings);

    if (batchEntries.size === 0 && response.results.bindings.length === 0) {
      console.log("[gen-masterlist]   no more results. Done fetching.");
      break;
    }

    for (const [slug, entry] of batchEntries) {
      if (allEntries.size >= limit) break;
      if (!allEntries.has(slug)) {
        allEntries.set(slug, entry);
      }
    }

    offset += batchLimit;

    // If we got fewer bindings than requested, we're done
    if (response.results.bindings.length < batchLimit) {
      break;
    }

    // Be polite: delay between batches
    if (allEntries.size < limit) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const result = Array.from(allEntries.values()).slice(0, limit);
  console.log(`[gen-masterlist] Collected ${result.length} unique entries (limit=${limit}).`);

  // Write output
  fs.mkdirSync(SEEDS_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2) + "\n");
  console.log(`[gen-masterlist] Wrote ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("[gen-masterlist] Fatal error:", err);
  process.exit(1);
});
