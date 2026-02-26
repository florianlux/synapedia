/**
 * Substance category classification for harm-reduction risk overlay.
 *
 * DISCLAIMER: This mapping is heuristic and educational only.
 * It does NOT constitute medical advice.
 */

export type SubstanceCategory =
  | "stimulant"
  | "opioid"
  | "gabaergic"
  | "psychedelic"
  | "dissociative"
  | "cannabis"
  | "nicotine"
  | "unknown";

/** Alias map: all keys are lowercase, normalized values point to canonical name */
const ALIAS_MAP: Record<string, string> = {
  // Stimulants
  "a-pvp": "a-pvp",
  "alpha-pvp": "a-pvp",
  "alpha pvp": "a-pvp",
  "α-pvp": "a-pvp",
  "nep": "n-ethylpentedrone",
  "n-ethylpentedrone": "n-ethylpentedrone",
  "3-fa": "3-fluoroamphetamine",
  "3-fluoroamphetamine": "3-fluoroamphetamine",
  "3-fma": "3-fluoromethamphetamine",
  "amphetamine": "amphetamine",
  "speed": "amphetamine",
  "methamphetamine": "methamphetamine",
  "crystal": "methamphetamine",
  "mdma": "mdma",
  "ecstasy": "mdma",
  "cocaine": "cocaine",
  "kokain": "cocaine",
  "methylphenidate": "methylphenidate",
  "ritalin": "methylphenidate",

  // Opioids
  "2-map-237": "2-map-237",
  "2map": "2-map-237",
  "2-methyl-ap-237": "2-map-237",
  "2 methyl ap 237": "2-map-237",
  "2map237": "2-map-237",
  "kratom": "kratom",
  "mitragynine": "kratom",
  "7-hydroxymitragynine": "kratom",
  "o-dsmt": "o-dsmt",
  "o-desmethyltramadol": "o-dsmt",
  "tramadol": "tramadol",
  "morphine": "morphine",
  "morphin": "morphine",
  "codeine": "codeine",
  "codein": "codeine",
  "heroin": "heroin",
  "fentanyl": "fentanyl",

  // GABAergic
  "phenibut": "phenibut",
  "gabapentin": "gabapentin",
  "pregabalin": "pregabalin",
  "lyrica": "pregabalin",
  "diazepam": "diazepam",
  "valium": "diazepam",
  "alprazolam": "alprazolam",
  "xanax": "alprazolam",
  "clonazepam": "clonazepam",
  "lorazepam": "lorazepam",
  "etizolam": "etizolam",
  "flualprazolam": "flualprazolam",
  "bromazolam": "bromazolam",
  "ghb": "ghb",
  "gbl": "ghb",
  "alcohol": "alcohol",
  "alkohol": "alcohol",
  "ethanol": "alcohol",

  // Psychedelics
  "psilocybin": "psilocybin",
  "psilocin": "psilocybin",
  "lsd": "lsd",
  "1p-lsd": "1p-lsd",
  "1v-lsd": "1v-lsd",
  "dmt": "dmt",
  "mescaline": "mescaline",
  "mescalin": "mescaline",
  "2c-b": "2c-b",

  // Dissociatives
  "ketamine": "ketamine",
  "ketamin": "ketamine",
  "dxm": "dxm",
  "dextromethorphan": "dxm",
  "pcp": "pcp",
  "mxe": "mxe",
  "3-meo-pcp": "3-meo-pcp",

  // Cannabis
  "thc": "thc",
  "cannabis": "thc",
  "marijuana": "thc",
  "marihuana": "thc",
  "weed": "thc",
  "gras": "thc",

  // Nicotine
  "nicotine": "nicotine",
  "nikotin": "nicotine",
  "tobacco": "nicotine",
  "tabak": "nicotine",
};

/** Canonical substance → category mapping */
const CATEGORY_MAP: Record<string, SubstanceCategory> = {
  // Stimulants
  "a-pvp": "stimulant",
  "n-ethylpentedrone": "stimulant",
  "3-fluoroamphetamine": "stimulant",
  "3-fluoromethamphetamine": "stimulant",
  "amphetamine": "stimulant",
  "methamphetamine": "stimulant",
  "mdma": "stimulant",
  "cocaine": "stimulant",
  "methylphenidate": "stimulant",

  // Opioids
  "2-map-237": "opioid",
  "kratom": "opioid",
  "o-dsmt": "opioid",
  "tramadol": "opioid",
  "morphine": "opioid",
  "codeine": "opioid",
  "heroin": "opioid",
  "fentanyl": "opioid",

  // GABAergic
  "phenibut": "gabaergic",
  "gabapentin": "gabaergic",
  "pregabalin": "gabaergic",
  "diazepam": "gabaergic",
  "alprazolam": "gabaergic",
  "clonazepam": "gabaergic",
  "lorazepam": "gabaergic",
  "etizolam": "gabaergic",
  "flualprazolam": "gabaergic",
  "bromazolam": "gabaergic",
  "ghb": "gabaergic",
  "alcohol": "gabaergic",

  // Psychedelics
  "psilocybin": "psychedelic",
  "lsd": "psychedelic",
  "1p-lsd": "psychedelic",
  "1v-lsd": "psychedelic",
  "dmt": "psychedelic",
  "mescaline": "psychedelic",
  "2c-b": "psychedelic",

  // Dissociatives
  "ketamine": "dissociative",
  "dxm": "dissociative",
  "pcp": "dissociative",
  "mxe": "dissociative",
  "3-meo-pcp": "dissociative",

  // Cannabis
  "thc": "cannabis",

  // Nicotine
  "nicotine": "nicotine",
};

/**
 * Normalize a substance name: lowercase, trim, resolve aliases.
 */
export function normalizeSubstance(raw: string): string {
  const key = raw.toLowerCase().trim().replace(/\s+/g, " ");
  return ALIAS_MAP[key] ?? key;
}

/**
 * Classify a substance name into a category.
 */
export function classifySubstance(raw: string): SubstanceCategory {
  const canonical = normalizeSubstance(raw);
  if (CATEGORY_MAP[canonical]) return CATEGORY_MAP[canonical];

  // Heuristic: check if the canonical name contains known keywords
  const lower = canonical.toLowerCase();
  if (lower.includes("amphetamine") || lower.includes("cathinone")) return "stimulant";
  if (lower.includes("benzo") || lower.includes("zolam") || lower.includes("zepam")) return "gabaergic";
  if (lower.includes("fentanyl") || lower.includes("morphine") || lower.includes("opioid")) return "opioid";

  return "unknown";
}

/**
 * Get all known categories for display purposes.
 */
export const DISPLAY_CATEGORIES: { key: SubstanceCategory; label: string }[] = [
  { key: "stimulant", label: "Stimulanzien" },
  { key: "opioid", label: "Opioide" },
  { key: "gabaergic", label: "GABAerg" },
  { key: "psychedelic", label: "Psychedelika" },
  { key: "dissociative", label: "Dissoziativa" },
  { key: "cannabis", label: "Cannabis" },
  { key: "nicotine", label: "Nikotin" },
  { key: "unknown", label: "Unbekannt" },
];
