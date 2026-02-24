/**
 * Canonicalization + deduplication utilities for substance names.
 * Normalizes names, resolves synonyms, and checks for duplicates.
 */

import { nameToSlug } from "./connectors";

/**
 * Normalize a substance name: trim, casefold, remove extra whitespace,
 * normalize common punctuation variants.
 */
export function canonicalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\u00AD/g, "")       // soft hyphen
    .replace(/[\u2010-\u2015]/g, "-"); // various dashes → ASCII hyphen
}

/**
 * Generate a canonical slug for deduplication.
 * Strips all non-alphanumeric, lowercases, normalizes umlauts.
 */
export function canonicalSlug(name: string): string {
  return nameToSlug(canonicalizeName(name));
}

/**
 * Common synonym map (lowercase alias → canonical name).
 * Extend as needed. Used for resolving known alternate names.
 */
const SYNONYM_MAP: Record<string, string> = {
  "acid": "LSD",
  "lucy": "LSD",
  "lysergic acid diethylamide": "LSD",
  "magic mushrooms": "Psilocybin",
  "shrooms": "Psilocybin",
  "psilocin": "Psilocybin",
  "ecstasy": "MDMA",
  "molly": "MDMA",
  "speed": "Amphetamin",
  "crystal meth": "Methamphetamin",
  "ice": "Methamphetamin",
  "crack": "Kokain",
  "coke": "Kokain",
  "cocaine": "Kokain",
  "k": "Ketamin",
  "special k": "Ketamin",
  "ketamine": "Ketamin",
  "heroine": "Heroin",
  "diacetylmorphine": "Heroin",
  "morphine": "Morphin",
  "codeine": "Codein",
  "oxycodone": "Oxycodon",
  "methadone": "Methadon",
  "buprenorphine": "Buprenorphin",
  "methamphetamine": "Methamphetamin",
  "amphetamine": "Amphetamin",
  "xanax": "Alprazolam",
  "valium": "Diazepam",
  "ativan": "Lorazepam",
  "klonopin": "Clonazepam",
  "ambien": "Zolpidem",
  "ritalin": "Methylphenidat",
  "concerta": "Methylphenidat",
  "provigil": "Modafinil",
  "strattera": "Atomoxetin",
  "wellbutrin": "Bupropion",
  "prozac": "Fluoxetin",
  "zoloft": "Sertralin",
  "lexapro": "Citalopram",
  "effexor": "Venlafaxin",
  "cymbalta": "Duloxetin",
  "remeron": "Mirtazapin",
  "seroquel": "Quetiapin",
  "zyprexa": "Olanzapin",
  "risperdal": "Risperidon",
  "abilify": "Aripiprazol",
  "haldol": "Haloperidol",
  "caffeine": "Koffein",
  "nicotine": "Nikotin",
  "alcohol": "Alkohol (Ethanol)",
  "ethanol": "Alkohol (Ethanol)",
  "ghb": "GHB",
  "gbl": "GBL",
  "nitrous oxide": "Lachgas (N2O)",
  "laughing gas": "Lachgas (N2O)",
  "dxm": "Dextromethorphan (DXM)",
  "kratom": "Kratom (Mitragynin)",
  "mitragynine": "Kratom (Mitragynin)",
  "thc": "THC",
  "cbd": "CBD",
  "cannabis": "THC",
  "marijuana": "THC",
  "weed": "THC",
  "pcp": "PCP",
  "angel dust": "PCP",
  "naloxone": "Naloxon",
  "naltrexone": "Naltrexon",
  "narcan": "Naloxon",
  "st. john's wort": "Johanniskraut",
  "saint john's wort": "Johanniskraut",
};

/**
 * Try to resolve a name to its canonical form via the synonym map.
 * Returns the canonical name if a synonym is found, otherwise the
 * original (cleaned) name.
 */
export function resolveSynonym(name: string): string {
  const cleaned = canonicalizeName(name);
  const lower = cleaned.toLowerCase();
  return SYNONYM_MAP[lower] ?? cleaned;
}

/**
 * Parse CSV/TSV content into substance entries.
 * Expects columns: name, synonyms (optional, semicolon-separated), notes (optional)
 */
export interface CsvSubstanceEntry {
  name: string;
  synonyms: string[];
  notes: string;
}

export function parseCsvTsv(content: string): CsvSubstanceEntry[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Detect separator
  const firstLine = lines[0];
  const separator = firstLine.includes("\t") ? "\t" : ",";

  // Check for header
  const headerLower = firstLine.toLowerCase();
  const hasHeader = headerLower.includes("name") || headerLower.includes("substanz");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const parts = line.split(separator).map((p) => p.trim().replace(/^["']|["']$/g, ""));
    return {
      name: parts[0] || "",
      synonyms: parts[1] ? parts[1].split(";").map((s) => s.trim()).filter(Boolean) : [],
      notes: parts[2] || "",
    };
  }).filter((e) => e.name.length > 0);
}

/**
 * Deduplicate a list of names by canonical slug, returning unique entries
 * with their slugs. Also resolves known synonyms.
 */
export interface DeduplicatedEntry {
  originalName: string;
  canonicalName: string;
  slug: string;
}

export function deduplicateNames(names: string[]): DeduplicatedEntry[] {
  const seen = new Set<string>();
  const result: DeduplicatedEntry[] = [];

  for (const raw of names) {
    const canonical = resolveSynonym(raw);
    const slug = canonicalSlug(canonical);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      result.push({ originalName: raw.trim(), canonicalName: canonical, slug });
    }
  }

  return result;
}
