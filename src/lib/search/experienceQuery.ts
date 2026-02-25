/**
 * Experience Search – Query Builder Utility
 *
 * SAFETY GUARDRAILS
 * -----------------
 * • In "safesearch" mode the builder NEVER emits dosing language
 *   (mg, µg, dose, dosis, redosage, …). Any banned tokens that
 *   slip into a substance field are stripped and a warning is returned.
 * • In "partymode" dosing/recipe language IS allowed (user opted-in).
 * • We only produce search-engine query strings – no scraping, no crawling.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QueryMode =
  | "combination"
  | "safety"
  | "experience"
  | "medical";

export type Language = "DE" | "EN";

export interface Source {
  id: string;
  label: string;
  /** If set the source is restricted via site: operator */
  siteRestriction?: string;
  /** Search engine base URL for building clickable links */
  searchUrlBase: string;
}

export interface SearchConfig {
  substances: string[];
  sources: string[];
  mode: QueryMode;
  language: Language;
  requireComboTerms: boolean;
  safesearch: boolean;
  partymode: boolean;
}

export interface GeneratedQuery {
  source: string;
  query: string;
  url: string;
  /** If true this is a pairwise sub-query */
  pairwise?: boolean;
}

export interface GenerationResult {
  queries: GeneratedQuery[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SOURCES: Source[] = [
  {
    id: "reddit",
    label: "Reddit",
    siteRestriction: "site:reddit.com",
    searchUrlBase: "https://www.google.com/search?q=",
  },
  {
    id: "everave",
    label: "Eve-Rave",
    siteRestriction: "site:forum.eve-rave.ch",
    searchUrlBase: "https://www.google.com/search?q=",
  },
  {
    id: "drogenwiki",
    label: "Drogen Wiki",
    siteRestriction: "site:drogen.fandom.com",
    searchUrlBase: "https://www.google.com/search?q=",
  },
  {
    id: "psychonautwiki",
    label: "PsychonautWiki",
    siteRestriction: "site:psychonautwiki.org",
    searchUrlBase: "https://www.google.com/search?q=",
  },
  {
    id: "google",
    label: "Google (general)",
    searchUrlBase: "https://www.google.com/search?q=",
  },
  {
    id: "duckduckgo",
    label: "DuckDuckGo (general)",
    searchUrlBase: "https://duckduckgo.com/?q=",
  },
];

/**
 * Words that are BANNED in safesearch mode.
 * They are stripped from substance inputs and never appended as keywords.
 */
const BANNED_TOKENS_SAFESEARCH = [
  "best combo",
  "best mix",
  "optimal",
  "recipe",
  "how to",
  "how much",
  "dose",
  "dosage",
  "dosis",
  "mg",
  "µg",
  "ug",
  "mcg",
  "ml",
  "redosage",
  "nachlegen",
  "anleitung",
  "bauen",
  "pipe",
  "smoke method",
];

// ---------------------------------------------------------------------------
// Keyword sets per mode + language
// ---------------------------------------------------------------------------

const COMBO_INTENT: Record<Language, string[]> = {
  EN: ["together", "combined", "combination", "mixing", "mixed with", "co-use", "polydrug"],
  DE: ["kombination", "gemischt", "zusammen", "mix", "in kombi", "gleichzeitig", "polytox"],
};

const MODE_KEYWORDS: Record<QueryMode, Record<Language, string[]>> = {
  combination: {
    EN: [
      "interaction", "risk", "warning", "adverse effects",
      "nausea", "anxiety", "panic", "blackout",
      "heart rate", "serotonin syndrome", "respiratory depression", "comedown",
    ],
    DE: [
      "wechselwirkung", "risiko", "warnung", "nebenwirkungen",
      "übelkeit", "angst", "panik", "blackout",
      "puls", "serotoninsyndrom", "atemdepression", "comedown",
    ],
  },
  safety: {
    EN: [
      "interaction", "risk", "warning", "adverse effects",
      "contraindication", "overdose", "respiratory depression", "serotonin syndrome",
    ],
    DE: [
      "wechselwirkung", "risiko", "warnung", "nebenwirkungen",
      "kontraindikation", "überdosis", "atemdepression", "serotoninsyndrom",
    ],
  },
  experience: {
    EN: [
      "experience report", "trip report", "side effects",
      "anxiety", "paranoia", "blackout", "comedown",
    ],
    DE: [
      "erfahrung", "tripbericht", "nebenwirkungen",
      "angst", "paranoia", "blackout", "comedown",
    ],
  },
  medical: {
    EN: [
      "case report", "intoxication", "emergency department",
      "toxicology", "mortality",
    ],
    DE: [
      "fallbericht", "intoxikation", "notaufnahme",
      "toxikologie", "mortalität",
    ],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic pick of N items from arr (no randomness – always first N). */
function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.min(n, arr.length));
}

/**
 * Sanitize a substance name in safesearch mode.
 * Returns the cleaned string and a list of warnings.
 */
function sanitizeSubstance(raw: string, safesearch: boolean): { clean: string; warnings: string[] } {
  const warnings: string[] = [];
  let text = raw.trim();
  if (!safesearch) return { clean: text, warnings };

  for (const banned of BANNED_TOKENS_SAFESEARCH) {
    const regex = new RegExp(`\\b${banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    if (regex.test(text)) {
      warnings.push(`Banned token "${banned}" removed from substance "${raw}".`);
      text = text.replace(regex, "").replace(/\s{2,}/g, " ").trim();
    }
  }
  return { clean: text, warnings };
}

function buildSearchUrl(base: string, query: string): string {
  return base + encodeURIComponent(query);
}

// ---------------------------------------------------------------------------
// Main query generator
// ---------------------------------------------------------------------------

export function generateQueries(config: SearchConfig): GenerationResult {
  const warnings: string[] = [];

  // 1. Sanitize substance inputs
  const cleanSubstances: string[] = [];
  for (const raw of config.substances) {
    if (!raw.trim()) continue;
    const { clean, warnings: w } = sanitizeSubstance(raw, config.safesearch);
    warnings.push(...w);
    if (clean) cleanSubstances.push(clean);
  }

  if (cleanSubstances.length === 0) {
    return { queries: [], warnings: ["No valid substances provided."] };
  }

  // 2. Build base substance terms (quoted)
  const baseTerms = cleanSubstances.map((s) => `"${s}"`).join(" ");

  // 3. Pick combo-intent tokens
  const comboTokens = pick(COMBO_INTENT[config.language], 3);
  const comboString = comboTokens.join(" OR ");

  // 4. Pick mode keywords
  const modeKws = pick(MODE_KEYWORDS[config.mode][config.language], 6);
  const modeString = modeKws.join(" ");

  // 5. Determine whether to include combo terms
  const includeCombo =
    config.requireComboTerms &&
    (config.mode === "combination" || cleanSubstances.length >= 2);

  // 6. Build per-source queries
  const allSources = SOURCES.filter((s) => config.sources.includes(s.id));
  const queries: GeneratedQuery[] = [];

  for (const source of allSources) {
    const parts: string[] = [];
    if (source.siteRestriction) parts.push(source.siteRestriction);
    parts.push(baseTerms);
    if (includeCombo) parts.push(comboString);
    parts.push(modeString);

    const query = parts.join(" ");
    queries.push({
      source: source.label,
      query,
      url: buildSearchUrl(source.searchUrlBase, query),
    });
  }

  // 7. Pairwise queries for N >= 3 substances
  if (cleanSubstances.length >= 3) {
    for (let i = 0; i < cleanSubstances.length; i++) {
      for (let j = i + 1; j < cleanSubstances.length; j++) {
        const pairBase = `"${cleanSubstances[i]}" "${cleanSubstances[j]}"`;
        const pairCombo = pick(COMBO_INTENT[config.language], 2).join(" OR ");
        const pairSafety = pick(MODE_KEYWORDS[config.mode][config.language], 5).join(" ");

        for (const source of allSources) {
          const parts: string[] = [];
          if (source.siteRestriction) parts.push(source.siteRestriction);
          parts.push(pairBase);
          parts.push(pairCombo);
          parts.push(pairSafety);

          const query = parts.join(" ");
          queries.push({
            source: source.label,
            query,
            url: buildSearchUrl(source.searchUrlBase, query),
            pairwise: true,
          });
        }
      }
    }
  }

  // 8. Partymode-specific queries (only when safesearch is OFF and partymode is ON)
  if (config.partymode && !config.safesearch) {
    const partyTokens =
      config.language === "DE"
        ? ["dosis", "dosierung", "nachlegen", "wieviel mg"]
        : ["dose", "dosage", "how much", "redose"];

    for (const source of allSources) {
      const parts: string[] = [];
      if (source.siteRestriction) parts.push(source.siteRestriction);
      parts.push(baseTerms);
      parts.push(pick(partyTokens, 3).join(" OR "));

      const query = parts.join(" ");
      queries.push({
        source: source.label,
        query,
        url: buildSearchUrl(source.searchUrlBase, query),
      });
    }
  }

  return { queries, warnings };
}

// ---------------------------------------------------------------------------
// Export bundle helper (for shareable JSON)
// ---------------------------------------------------------------------------

export interface SearchBundle {
  substances: string[];
  sources: string[];
  mode: string;
  language: string;
  requireComboTerms: boolean;
  safesearch: boolean;
  partymode: boolean;
  queries: { source: string; query: string }[];
}

export function buildBundle(config: SearchConfig, queries: GeneratedQuery[]): SearchBundle {
  return {
    substances: config.substances.filter(Boolean),
    sources: config.sources,
    mode: config.mode,
    language: config.language,
    requireComboTerms: config.requireComboTerms,
    safesearch: config.safesearch,
    partymode: config.partymode,
    queries: queries.map(({ source, query }) => ({ source, query })),
  };
}
