/**
 * Modular SPARQL query builder for the Wikidata import pipeline.
 * Builds configurable queries to discover psychoactive substances.
 */

/** Map substance class names to their Wikidata QIDs. */
export const CLASS_QIDS: Record<string, string[]> = {
  stimulant: ["Q170588"],
  empathogen: ["Q423762"],
  psychedelic: ["Q407617"],
  dissociative: ["Q468989"],
  opioid: ["Q170383"],
  depressant: ["Q215980"],
  deliriant: ["Q1059541"],
  cannabinoid: ["Q422292"],
  antidepressant: ["Q260858"],
  antipsychotic: ["Q243643"],
  anxiolytic: ["Q230858"],
  analgesic: ["Q185253"],
};

/** QIDs that indicate psychoactive substances. */
export const PSYCHOACTIVE_BASE_QIDS = [
  "Q8386",    // psychoactive drug
  "Q207011",  // pharmaceutical drug
  "Q12140",   // medication
];

/** QIDs to exclude by default (too broad or irrelevant). */
export const EXCLUDE_QIDS = [
  "Q169336",  // mixture
  "Q79529",   // chemical compound (too broad)
  "Q12136",   // disease
  "Q11173",   // chemical compound
];

/** Filters for the SPARQL query builder. */
export interface ImportFilters {
  limit: number;
  includePharmaceuticals: boolean;
  includeNPS: boolean;
  includeCombinations: boolean;
  requirePubChemCID: boolean;
  requirePsychoactive: boolean;
  substanceClasses: string[];
  excludeSalts: boolean;
  excludeHormones: boolean;
  excludeNonPsychoactive: boolean;
  hasUNScheduling: boolean;
  germanyLegalStatusKnown: boolean;
}

/** Sensible defaults for substance discovery. */
export const DEFAULT_FILTERS: ImportFilters = {
  limit: 100,
  includePharmaceuticals: true,
  includeNPS: true,
  includeCombinations: false,
  requirePubChemCID: true,
  requirePsychoactive: true,
  substanceClasses: [],
  excludeSalts: true,
  excludeHormones: true,
  excludeNonPsychoactive: true,
  hasUNScheduling: false,
  germanyLegalStatusKnown: false,
};

/**
 * Build a modular SPARQL query for discovering substances on Wikidata.
 * Applies the given filters to constrain results.
 */
export function buildSparqlQuery(filters: ImportFilters): string {
  const lines: string[] = [];

  lines.push("SELECT DISTINCT ?item ?itemLabel ?itemDescription ?pubchemCID ?legalDE ?inn WHERE {");

  // Psychoactive base constraint (UNION of instance/subclass patterns)
  if (filters.requirePsychoactive) {
    const unions = PSYCHOACTIVE_BASE_QIDS.map(
      (qid) =>
        `    { ?item wdt:P31/wdt:P279* wd:${qid} . }`,
    );
    lines.push("  {");
    lines.push(unions.join("\n  UNION\n"));
    lines.push("  }");
  }

  // Substance class filter (UNION for selected class QIDs)
  if (filters.substanceClasses.length > 0) {
    const classUnions: string[] = [];
    for (const cls of filters.substanceClasses) {
      const qids = CLASS_QIDS[cls];
      if (!qids) continue;
      for (const qid of qids) {
        classUnions.push(`    { ?item wdt:P31/wdt:P279* wd:${qid} . }`);
      }
    }
    if (classUnions.length > 0) {
      lines.push("  {");
      lines.push(classUnions.join("\n  UNION\n"));
      lines.push("  }");
    }
  }

  // PubChem CID requirement
  if (filters.requirePubChemCID) {
    lines.push("  ?item wdt:P662 ?pubchemCID .");
  }

  // Exclude drug combinations
  if (!filters.includeCombinations) {
    lines.push("  FILTER NOT EXISTS { ?item wdt:P31 wd:Q1304270 . }");
  }

  // Exclude salt forms by label
  if (filters.excludeSalts) {
    const saltTerms = ["hydrochloride", "acetate", "tartrate", "sulfate", "fumarate"];
    const conditions = saltTerms.map((t) => `CONTAINS(LCASE(?itemLabel), "${t}")`);
    lines.push(`  FILTER(!${conditions.join(" && !")})`);
  }

  // Exclude hormones
  if (filters.excludeHormones) {
    lines.push("  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q11364 . }");
  }

  // Legal status in Germany
  if (filters.germanyLegalStatusKnown) {
    lines.push("  ?item wdt:P3493 ?legalDE .");
  }

  // UN scheduling / WHO INN (optional)
  if (filters.hasUNScheduling) {
    lines.push("  OPTIONAL { ?item wdt:P3489 ?inn . }");
  }

  // Label service
  lines.push('  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de" . }');

  lines.push("}");
  lines.push("ORDER BY ?itemLabel");
  lines.push(`LIMIT ${filters.limit}`);

  return lines.join("\n");
}

/** Terms that suggest psychoactive relevance in a description. */
const PSYCHOACTIVE_TERMS = [
  "psychoactive",
  "psychedelic",
  "stimulant",
  "depressant",
  "opioid",
  "dissociative",
  "hallucinogen",
  "sedative",
  "anxiolytic",
  "empathogen",
  "entactogen",
  "cannabinoid",
  "nootropic",
  "euphoriant",
];

/**
 * Compute a confidence score (0–100) that an item is a relevant
 * psychoactive substance based on available metadata.
 */
export function computePsychoactiveConfidence(item: {
  classes?: string[];
  description?: string;
  pubchem_cid?: number;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // +40 if any class matches psychoactive base QIDs
  if (item.classes?.some((c) => PSYCHOACTIVE_BASE_QIDS.includes(c))) {
    score += 40;
    reasons.push("class matches psychoactive base QID");
  }

  // +30 if substance class filter matches known CLASS_QIDS values
  const allClassQids = Object.values(CLASS_QIDS).flat();
  if (item.classes?.some((c) => allClassQids.includes(c))) {
    score += 30;
    reasons.push("class matches known substance class");
  }

  // +15 if has PubChem CID
  if (item.pubchem_cid != null) {
    score += 15;
    reasons.push("has PubChem CID");
  }

  // +15 if description contains psychoactive-related terms
  if (item.description) {
    const lower = item.description.toLowerCase();
    if (PSYCHOACTIVE_TERMS.some((t) => lower.includes(t))) {
      score += 15;
      reasons.push("description contains psychoactive-related term");
    }
  }

  return { score: Math.min(score, 100), reasons };
}
