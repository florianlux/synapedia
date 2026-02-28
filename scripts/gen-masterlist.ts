/**
 * Generate a masterlist of psychoactive substances from Wikidata SPARQL.
 *
 * For each substance the script captures:
 *   - Wikidata QID, English label, aliases
 *   - PubChem CID (if available via P662)
 *   - Best-effort category tags derived from Wikidata class hierarchy
 *
 * Output → seeds/substances.masterlist.json  (committed to repo)
 *
 * Usage:
 *   npx tsx scripts/gen-masterlist.ts --limit 1000
 *
 * Synapedia is a scientific education platform — no consumption guides,
 * no dosage tables, no procurement hints. Only neutral metadata is exported.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

import { slugify } from "../src/lib/substances/slugify";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "SynapediaBot/1.0 (https://github.com/florianlux/synapedia)";

const DEFAULT_LIMIT = 1000;

/** Delay between SPARQL batches in ms (be polite to Wikidata) */
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

export interface MasterlistEntry {
  name: string;
  slug: string;
  aliases: string[];
  qid: string;
  pubchem_cid: number | null;
  tags: string[];
}

interface MasterlistFile {
  generated_at: string;
  count: number;
  entries: MasterlistEntry[];
}

interface SparqlBinding {
  item: { value: string };
  itemLabel: { value: string };
  itemAltLabel?: { value: string };
  pubchemCID?: { value: string };
  classLabel?: { value: string };
}

interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

// ---------------------------------------------------------------------------
// Wikidata class → tag mapping
// ---------------------------------------------------------------------------

const CLASS_TAG_MAP: Record<string, string> = {
  stimulant: "stimulant",
  "psychostimulant": "stimulant",
  "central nervous system stimulant": "stimulant",
  amphetamine: "stimulant",
  opioid: "opioid",
  "opioid analgesic": "opioid",
  "opioid receptor agonist": "opioid",
  benzodiazepine: "benzodiazepine",
  psychedelic: "psychedelic",
  "psychedelic drug": "psychedelic",
  hallucinogen: "psychedelic",
  "serotonergic psychedelic": "psychedelic",
  dissociative: "dissociative",
  "dissociative drug": "dissociative",
  "dissociative anaesthetic": "dissociative",
  cannabinoid: "cannabinoid",
  "synthetic cannabinoid": "cannabinoid",
  deliriant: "deliriant",
  "anticholinergic": "deliriant",
  depressant: "depressant",
  "central nervous system depressant": "depressant",
  sedative: "depressant",
  "sedative-hypnotic": "depressant",
  barbiturate: "depressant",
  "designer drug": "nps",
  "new psychoactive substance": "nps",
  "research chemical": "nps",
  entactogen: "entactogen",
  "empathogen–entactogen": "entactogen",
  "empathogen-entactogen": "entactogen",
  "anxiolytic": "anxiolytic",
  "antidepressant": "antidepressant",
  "analgesic": "analgesic",
  "anaesthetic": "anaesthetic",
  "anesthetic": "anaesthetic",
  "nootropic": "nootropic",
};

function classToTag(classLabel: string): string | null {
  const lower = classLabel.toLowerCase().trim();
  if (CLASS_TAG_MAP[lower]) return CLASS_TAG_MAP[lower];

  // Fuzzy partial match
  for (const [key, tag] of Object.entries(CLASS_TAG_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return tag;
  }
  return null;
}

// ---------------------------------------------------------------------------
// SPARQL Query
// ---------------------------------------------------------------------------

function buildQuery(limit: number, offset: number): string {
  return `
SELECT DISTINCT ?item ?itemLabel ?itemAltLabel ?pubchemCID ?classLabel WHERE {
  {
    ?item wdt:P31/wdt:P279* wd:Q8386 .
  } UNION {
    ?item wdt:P31 wd:Q207011 .
  } UNION {
    ?item wdt:P31/wdt:P279* wd:Q11173 .
    ?item wdt:P31 wd:Q207011 .
  }
  OPTIONAL { ?item wdt:P662 ?pubchemCID . }
  OPTIONAL { ?item wdt:P31 ?class . ?class rdfs:label ?classLabel . FILTER(LANG(?classLabel) = "en") }
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

// ---------------------------------------------------------------------------
// Parse & deduplicate
// ---------------------------------------------------------------------------

function parseBindings(bindings: SparqlBinding[]): Map<string, MasterlistEntry> {
  const map = new Map<string, MasterlistEntry>();

  for (const b of bindings) {
    const qid = b.item.value.replace("http://www.wikidata.org/entity/", "");
    const label = b.itemLabel?.value ?? "";
    if (!qid || !label || label === qid) continue;

    const slug = slugify(label);
    if (!slug) continue;

    // Parse aliases from altLabel (Wikidata returns comma-separated)
    const rawAliases = b.itemAltLabel?.value ?? "";
    const aliases = rawAliases
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a && a !== label);

    const cidRaw = b.pubchemCID?.value ? parseInt(b.pubchemCID.value, 10) : null;
    const pubchemCid = cidRaw && !isNaN(cidRaw) ? cidRaw : null;

    const classLabel = b.classLabel?.value ?? "";
    const tag = classLabel ? classToTag(classLabel) : null;

    if (map.has(slug)) {
      // Merge: add aliases and tags to existing entry
      const existing = map.get(slug)!;
      for (const a of aliases) {
        if (!existing.aliases.includes(a)) existing.aliases.push(a);
      }
      if (tag && !existing.tags.includes(tag)) existing.tags.push(tag);
      if (!existing.pubchem_cid && pubchemCid) existing.pubchem_cid = pubchemCid;
    } else {
      map.set(slug, {
        name: label,
        slug,
        aliases: aliases.slice(0, 20), // cap aliases
        qid,
        pubchem_cid: pubchemCid,
        tags: tag ? [tag] : [],
      });
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { limit: number; verbose: boolean } {
  let limit = DEFAULT_LIMIT;
  let verbose = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) {
      const parsed = parseInt(argv[i + 1], 10);
      if (isNaN(parsed) || parsed < 1) {
        console.warn(`[gen-masterlist] Invalid --limit value "${argv[i + 1]}", using default ${DEFAULT_LIMIT}.`);
      } else {
        limit = parsed;
      }
      i++;
    }
    if (argv[i] === "--verbose") verbose = true;
  }

  return { limit, verbose };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function generateMasterlist(opts: {
  limit?: number;
  verbose?: boolean;
} = {}): Promise<MasterlistEntry[]> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const verbose = opts.verbose ?? false;

  console.log(`[gen-masterlist] Fetching substances from Wikidata SPARQL (target=${limit})…`);

  const allEntries = new Map<string, MasterlistEntry>();
  let offset = 0;
  const batchSize = Math.min(limit * 2, 2000); // fetch 2× target per batch since JOINs produce duplicates

  // Wikidata OPTIONAL joins can yield multiple rows per substance.
  // Fetch up to 3× the target limit to collect enough unique entries after dedup.
  const maxFetch = limit * 3;

  while (offset < maxFetch) {
    const currentBatch = Math.min(batchSize, maxFetch - offset);
    console.log(`[gen-masterlist]   batch offset=${offset}, size=${currentBatch}…`);

    const query = buildQuery(currentBatch, offset);
    const response = await fetchSparql(query);
    const parsed = parseBindings(response.results.bindings);

    let newCount = 0;
    for (const [slug, entry] of parsed) {
      if (!allEntries.has(slug)) {
        allEntries.set(slug, entry);
        newCount++;
      } else {
        // Merge tags and aliases
        const existing = allEntries.get(slug)!;
        for (const a of entry.aliases) {
          if (!existing.aliases.includes(a)) existing.aliases.push(a);
        }
        for (const t of entry.tags) {
          if (!existing.tags.includes(t)) existing.tags.push(t);
        }
        if (!existing.pubchem_cid && entry.pubchem_cid) {
          existing.pubchem_cid = entry.pubchem_cid;
        }
      }
    }

    if (verbose) {
      console.log(`[gen-masterlist]     → ${parsed.size} parsed, ${newCount} new (total unique: ${allEntries.size})`);
    }

    // Stop if we have enough
    if (allEntries.size >= limit) {
      console.log(`[gen-masterlist]   reached target ${limit}, stopping.`);
      break;
    }

    // Stop if no results in this batch
    if (response.results.bindings.length === 0) {
      console.log(`[gen-masterlist]   no more results at offset=${offset}. Done.`);
      break;
    }

    offset += currentBatch;

    // Polite delay between batches
    if (offset < maxFetch) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // Convert to sorted array, hard-limit
  const result = Array.from(allEntries.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);

  // Cap aliases per entry
  for (const entry of result) {
    entry.aliases = entry.aliases.slice(0, 20);
  }

  console.log(`[gen-masterlist] Collected ${result.length} unique substances.`);

  // Write output
  fs.mkdirSync(SEEDS_DIR, { recursive: true });
  const output: MasterlistFile = {
    generated_at: new Date().toISOString(),
    count: result.length,
    entries: result,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log(`[gen-masterlist] Written to ${OUTPUT_FILE}`);

  return result;
}

// CLI entry point
const isDirectRun =
  typeof require !== "undefined"
    ? require.main === module
    : process.argv[1] && import.meta.url === url.pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const { limit, verbose } = parseArgs(process.argv.slice(2));
  generateMasterlist({ limit, verbose }).catch((err) => {
    console.error("[gen-masterlist] Fatal error:", err);
    process.exit(1);
  });
}
