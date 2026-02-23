/**
 * PsychonautWiki Importer Library
 *
 * Extracted from scripts/import-psychonautwiki.ts for use by the admin job worker.
 * Fetches substance data from PsychonautWiki GraphQL API.
 *
 * Content licensed under CC BY-SA 4.0 — every entry includes attribution.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_URL = "https://api.psychonautwiki.org/";
const PSYCHONAUTWIKI_BASE = "https://psychonautwiki.org/wiki/";
const LICENSE_TEXT = "Content sourced from PsychonautWiki, licensed under CC BY-SA 4.0";
const LICENSE_URL = "https://psychonautwiki.org/wiki/Copyrights";

const RATE_LIMIT_MS = 2000;

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
  roas: {
    name: string | null;
    dose: DoseInfo | null;
    duration: Record<string, DoseRange | null> | null;
    bioavailability: DoseRange | null;
  }[] | null;
  effects: { name: string; url: string | null }[] | null;
  uncertainInteractions: { name: string }[] | null;
  unsafeInteractions: { name: string }[] | null;
  dangerousInteractions: { name: string }[] | null;
}

export interface ImportedSubstance {
  name: string;
  slug: string;
  aliases: string[];
  summary: string | null;
  class_primary: string | null;
  class_secondary: string | null;
  source_url: string;
  source_license: string;
  source_license_url: string;
  imported_at: string;
  effects: string[];
  interactions: {
    uncertain: string[];
    unsafe: string[];
    dangerous: string[];
  };
  addiction_potential: string | null;
  toxicity: string[];
  tolerance: {
    full: string | null;
    half: string | null;
    zero: string | null;
  } | null;
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

// ---------------------------------------------------------------------------
// API Fetch
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
    throw new Error(
      `PsychonautWiki API error: ${response.status} ${response.statusText}`
    );
  }

  const json = (await response.json()) as {
    data: T;
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error(
      `GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`
    );
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

function transformSubstance(
  raw: RawSubstance,
  importedAt: string
): ImportedSubstance {
  const sourceUrl =
    raw.url ?? `${PSYCHONAUTWIKI_BASE}${encodeURIComponent(raw.name)}`;

  return {
    name: raw.name,
    slug: slugify(raw.name),
    aliases: raw.commonNames ?? [],
    summary: raw.summary?.slice(0, 2500) ?? null,
    class_primary: raw.class?.chemical?.[0] ?? null,
    class_secondary: raw.class?.psychoactive?.[0] ?? null,
    source_url: sourceUrl,
    source_license: LICENSE_TEXT,
    source_license_url: LICENSE_URL,
    imported_at: importedAt,
    effects: (raw.effects ?? []).map((e) => e.name),
    interactions: {
      uncertain: (raw.uncertainInteractions ?? []).map((i) => i.name),
      unsafe: (raw.unsafeInteractions ?? []).map((i) => i.name),
      dangerous: (raw.dangerousInteractions ?? []).map((i) => i.name),
    },
    addiction_potential: raw.addictionPotential ?? null,
    toxicity: raw.toxicity ?? [],
    tolerance: raw.tolerance ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch all substances from PsychonautWiki GraphQL API.
 * Returns transformed substance data ready for DB upsert.
 */
export async function fetchSubstancesFromApi(): Promise<ImportedSubstance[]> {
  const data = await graphqlFetch<{ substances: RawSubstance[] }>(
    SUBSTANCES_QUERY
  );
  const importedAt = new Date().toISOString();
  return data.substances
    .filter((s) => s.name)
    .map((s) => transformSubstance(s, importedAt));
}

export { slugify, LICENSE_TEXT, LICENSE_URL };
