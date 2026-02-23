/**
 * PsychonautWiki GraphQL Import Script
 *
 * Fetches substance data from the official PsychonautWiki GraphQL API
 * (https://api.psychonautwiki.org/) and writes it to /data/substances.json
 * and /data/categories.json.
 *
 * Compliance:
 * - Content is licensed under CC BY-SA 4.0 — every entry includes attribution.
 * - No consumption instructions; content is neutral & harm-reduction oriented.
 * - Rate-limiting between requests to avoid API stress.
 * - Each import stores source_url(s) and an imported_at timestamp.
 *
 * Usage:
 *   npx tsx scripts/import-psychonautwiki.ts [--force]
 *
 * Options:
 *   --force   Skip cache check and re-import regardless of age
 */

import * as fs from "node:fs";
import * as path from "node:path";

import * as url from "node:url";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_URL = "https://api.psychonautwiki.org/";
const PSYCHONAUTWIKI_BASE = "https://psychonautwiki.org/wiki/";
const LICENSE_URL = "https://psychonautwiki.org/wiki/Copyrights";
const LICENSE_TEXT = "Content sourced from PsychonautWiki, licensed under CC BY-SA 4.0";

/** Minimum milliseconds between consecutive API requests */
const RATE_LIMIT_MS = 2000;

/** Cache validity in milliseconds (24 hours) */
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const SCRIPT_DIR =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(url.fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(SCRIPT_DIR, "..", "data");
const SUBSTANCES_FILE = path.join(DATA_DIR, "substances.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DoseRange {
  min: number | null;
  max: number | null;
}

interface DoseInfo {
  threshold: number | null;
  light: DoseRange | null;
  common: DoseRange | null;
  strong: DoseRange | null;
  heavy: number | null;
}

interface RoaDose {
  name: string | null;
  dose: DoseInfo | null;
  duration: {
    onset: DoseRange | null;
    comeup: DoseRange | null;
    peak: DoseRange | null;
    offset: DoseRange | null;
    total: DoseRange | null;
    afterglow: DoseRange | null;
  } | null;
  bioavailability: DoseRange | null;
}

interface RawSubstance {
  name: string;
  url: string | null;
  summary: string | null;
  addictionPotential: string | null;
  toxicity: string[] | null;
  crossTolerances: string[] | null;
  commonNames: string[] | null;
  class: {
    chemical: string[] | null;
    psychoactive: string[] | null;
  } | null;
  tolerance: {
    full: string | null;
    half: string | null;
    zero: string | null;
  } | null;
  roas: RoaDose[] | null;
  effects: { name: string; url: string | null }[] | null;
  uncertainInteractions: { name: string }[] | null;
  unsafeInteractions: { name: string }[] | null;
  dangerousInteractions: { name: string }[] | null;
}

export interface Substance {
  name: string;
  slug: string;
  common_names: string[];
  summary: string | null;
  chemical_class: string[];
  psychoactive_class: string[];
  addiction_potential: string | null;
  toxicity: string[];
  cross_tolerances: string[];
  tolerance: {
    full: string | null;
    half: string | null;
    zero: string | null;
  } | null;
  routes_of_administration: RouteOfAdministration[];
  effects: string[];
  interactions: {
    uncertain: string[];
    unsafe: string[];
    dangerous: string[];
  };
  source_url: string;
  source_api: string;
  license: string;
  license_url: string;
  imported_at: string;
}

interface RouteOfAdministration {
  name: string | null;
  dose: DoseInfo | null;
  duration: {
    onset: DoseRange | null;
    comeup: DoseRange | null;
    peak: DoseRange | null;
    offset: DoseRange | null;
    total: DoseRange | null;
    afterglow: DoseRange | null;
  } | null;
  bioavailability: DoseRange | null;
}

export interface Category {
  name: string;
  type: "chemical" | "psychoactive";
  substances: string[];
}

interface CategoriesFile {
  license: string;
  license_url: string;
  imported_at: string;
  categories: Category[];
}

// ---------------------------------------------------------------------------
// GraphQL Query
// ---------------------------------------------------------------------------

const SUBSTANCES_QUERY = `{
  substances(limit: 500) {
    name
    url
    summary
    addictionPotential
    toxicity
    crossTolerances
    commonNames
    class {
      chemical
      psychoactive
    }
    tolerance {
      full
      half
      zero
    }
    roas {
      name
      dose {
        threshold
        light { min max }
        common { min max }
        strong { min max }
        heavy
      }
      duration {
        onset { min max }
        comeup { min max }
        peak { min max }
        offset { min max }
        total { min max }
        afterglow { min max }
      }
      bioavailability { min max }
    }
    effects {
      name
      url
    }
    uncertainInteractions { name }
    unsafeInteractions { name }
    dangerousInteractions { name }
  }
}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isCacheFresh(): boolean {
  try {
    const raw = fs.readFileSync(SUBSTANCES_FILE, "utf-8");
    const data: Substance[] = JSON.parse(raw);
    if (!Array.isArray(data) || data.length === 0) return false;
    const importedAt = data[0]?.imported_at;
    if (!importedAt) return false;
    return Date.now() - new Date(importedAt).getTime() < CACHE_MAX_AGE_MS;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// API Fetch with Rate Limiting
// ---------------------------------------------------------------------------

let lastRequestTime = 0;

async function graphqlFetch<T>(query: string): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - elapsed);
  }
  lastRequestTime = Date.now();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`PsychonautWiki API error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as { data: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Transform raw API data → our data model
// ---------------------------------------------------------------------------

function transformSubstance(raw: RawSubstance, importedAt: string): Substance {
  const sourceUrl = raw.url ?? `${PSYCHONAUTWIKI_BASE}${encodeURIComponent(raw.name)}`;

  return {
    name: raw.name,
    slug: slugify(raw.name),
    common_names: raw.commonNames ?? [],
    summary: raw.summary ?? null,
    chemical_class: raw.class?.chemical ?? [],
    psychoactive_class: raw.class?.psychoactive ?? [],
    addiction_potential: raw.addictionPotential ?? null,
    toxicity: raw.toxicity ?? [],
    cross_tolerances: raw.crossTolerances ?? [],
    tolerance: raw.tolerance ?? null,
    routes_of_administration: (raw.roas ?? []).map((roa) => ({
      name: roa.name ?? null,
      dose: roa.dose ?? null,
      duration: roa.duration ?? null,
      bioavailability: roa.bioavailability ?? null,
    })),
    effects: (raw.effects ?? []).map((e) => e.name),
    interactions: {
      uncertain: (raw.uncertainInteractions ?? []).map((i) => i.name),
      unsafe: (raw.unsafeInteractions ?? []).map((i) => i.name),
      dangerous: (raw.dangerousInteractions ?? []).map((i) => i.name),
    },
    source_url: sourceUrl,
    source_api: API_URL,
    license: LICENSE_TEXT,
    license_url: LICENSE_URL,
    imported_at: importedAt,
  };
}

// ---------------------------------------------------------------------------
// Build categories taxonomy from substance data
// ---------------------------------------------------------------------------

function buildCategories(substances: Substance[], importedAt: string): CategoriesFile {
  const chemMap = new Map<string, Set<string>>();
  const psychMap = new Map<string, Set<string>>();

  for (const sub of substances) {
    for (const cls of sub.chemical_class) {
      if (!chemMap.has(cls)) chemMap.set(cls, new Set());
      chemMap.get(cls)!.add(sub.name);
    }
    for (const cls of sub.psychoactive_class) {
      if (!psychMap.has(cls)) psychMap.set(cls, new Set());
      psychMap.get(cls)!.add(sub.name);
    }
  }

  const categories: Category[] = [];

  for (const [name, subs] of [...chemMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    categories.push({ name, type: "chemical", substances: [...subs].sort() });
  }
  for (const [name, subs] of [...psychMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    categories.push({ name, type: "psychoactive", substances: [...subs].sort() });
  }

  return {
    license: LICENSE_TEXT,
    license_url: LICENSE_URL,
    imported_at: importedAt,
    categories,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function importSubstances(force = false): Promise<{
  substances: Substance[];
  categories: CategoriesFile;
}> {
  // Cache check
  if (!force && isCacheFresh()) {
    console.log("Cache is still fresh (< 24 h). Use --force to re-import.");
    const substances: Substance[] = JSON.parse(fs.readFileSync(SUBSTANCES_FILE, "utf-8"));
    const categories: CategoriesFile = JSON.parse(fs.readFileSync(CATEGORIES_FILE, "utf-8"));
    return { substances, categories };
  }

  console.log("Fetching substances from PsychonautWiki GraphQL API…");
  const data = await graphqlFetch<{ substances: RawSubstance[] }>(SUBSTANCES_QUERY);

  const importedAt = new Date().toISOString();
  const substances = data.substances
    .filter((s) => s.name)
    .map((s) => transformSubstance(s, importedAt));

  console.log(`Received ${substances.length} substances. Building categories…`);
  const categories = buildCategories(substances, importedAt);

  // Ensure data directory exists
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Write files
  fs.writeFileSync(SUBSTANCES_FILE, JSON.stringify(substances, null, 2) + "\n");
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2) + "\n");

  console.log(`Wrote ${substances.length} substances to ${SUBSTANCES_FILE}`);
  console.log(`Wrote ${categories.categories.length} categories to ${CATEGORIES_FILE}`);

  return { substances, categories };
}

// CLI entry point — only runs when executed directly, not when imported as a module
const isDirectRun =
  typeof require !== "undefined"
    ? require.main === module
    : process.argv[1] && import.meta.url === url.pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  importSubstances(force).catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
}
