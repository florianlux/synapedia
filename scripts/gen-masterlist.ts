/**
 * gen-masterlist.ts
 *
 * REST-based Wikidata importer (no SPARQL).
 * Stable for GitHub Actions.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { slugify } from "./lib/slugify.js";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const USER_AGENT =
  "synapedia-import/REST-1.0 (https://github.com/florianlux/synapedia)";

const REQUEST_DELAY_MS = 300;
const MAX_BATCH = 50;

// Psychoactive relevant class QIDs
const TARGET_CLASSES = [
  "Q204082", // psychoactive drug
  "Q207011", // recreational drug
  "Q189092", // hallucinogen
  "Q12029",  // stimulant
  "Q205989", // depressant
  "Q11254",  // opioid
  "Q409199", // benzodiazepine
  "Q4164871",// dissociative
  "Q40050",  // cannabinoid
];

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

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(urlStr: string) {
  const res = await fetch(urlStr, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Fetch members of a class via REST
// ---------------------------------------------------------------------------

async function fetchClassMembers(qid: string): Promise<string[]> {
  const urlStr = `https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=haswbstatement:P31=${qid}&format=json&srlimit=50`;
  const json = await fetchJSON(urlStr);

  if (!json.query?.search) return [];

  return json.query.search.map((item: any) => item.title);
}

// ---------------------------------------------------------------------------
// Fetch entity details
// ---------------------------------------------------------------------------

async function fetchEntities(qids: string[]) {
  const chunks = [];
  for (let i = 0; i < qids.length; i += MAX_BATCH) {
    chunks.push(qids.slice(i, i + MAX_BATCH));
  }

  const results: any[] = [];

  for (const chunk of chunks) {
    const ids = chunk.join("|");
    const urlStr = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&languages=de|en&format=json&props=labels|aliases`;
    const json = await fetchJSON(urlStr);

    if (json.entities) {
      results.push(...Object.values(json.entities));
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return results;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 100;

  console.log(`[gen-masterlist] REST mode – limit ${limit}`);

  const collectedQids = new Set<string>();

  for (const cls of TARGET_CLASSES) {
    console.log(`[gen-masterlist] Fetching members of ${cls}`);
    try {
      const members = await fetchClassMembers(cls);
      members.forEach((m) => collectedQids.add(m));
      await sleep(REQUEST_DELAY_MS);
    } catch (err: any) {
      console.warn(`Failed fetching class ${cls}: ${err.message}`);
    }
  }

  const qidArray = Array.from(collectedQids).slice(0, limit);

  console.log(`[gen-masterlist] Fetching entity details (${qidArray.length})`);

  const entities = await fetchEntities(qidArray);

  const entries: MasterlistEntry[] = [];

  for (const e of entities) {
    const label =
      e.labels?.de?.value ??
      e.labels?.en?.value;

    if (!label) continue;

    const slug = slugify(label);
    if (!slug) continue;

    const aliases =
      e.aliases?.de?.map((a: any) => a.value) ??
      e.aliases?.en?.map((a: any) => a.value) ??
      [];

    entries.push({
      title: label,
      slug,
      aliases,
      tags: [],
      risk: "Unbekannt",
      evidence: "Unbekannt",
    });
  }

  fs.mkdirSync(SEEDS_DIR, { recursive: true });
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(entries.slice(0, limit), null, 2) + "\n"
  );

  console.log(`[gen-masterlist] Done. Wrote ${entries.length} entries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
