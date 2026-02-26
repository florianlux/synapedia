export type SubstanceCategory = "stimulant" | "opioid" | "gabaergic" | "cannabis" | "nicotine" | "psychedelic" | "dissociative" | "unknown";

const SUBSTANCE_ALIASES: Record<string, string> = {
  "a-pvp": "a-pvp",
  "alpha pvp": "a-pvp",
  "alpha-pvp": "a-pvp",
  "apvp": "a-pvp",
  "nep": "n-ethylpentedrone",
  "n-ethylpentedrone": "n-ethylpentedrone",
  "3-fa": "3-fluoroamphetamine",
  "3-fluoroamphetamine": "3-fluoroamphetamine",
  "3fa": "3-fluoroamphetamine",
  "amphetamine": "amphetamine",
  "speed": "amphetamine",
  "amph": "amphetamine",
  "methamphetamine": "methamphetamine",
  "crystal": "methamphetamine",
  "meth": "methamphetamine",
  "cocaine": "cocaine",
  "koks": "cocaine",
  "mdma": "mdma",
  "ecstasy": "mdma",
  "4-mmc": "4-mmc",
  "mephedrone": "4-mmc",
  "kratom": "kratom",
  "mitragynine": "kratom",
  "7-hydroxymitragynine": "kratom",
  "2-map-237": "2-map-237",
  "2map": "2-map-237",
  "2-methyl-ap-237": "2-map-237",
  "2 methyl ap 237": "2-map-237",
  "2map237": "2-map-237",
  "o-dsmt": "o-dsmt",
  "odsmt": "o-dsmt",
  "tramadol": "tramadol",
  "phenibut": "phenibut",
  "etizolam": "etizolam",
  "alprazolam": "alprazolam",
  "xanax": "alprazolam",
  "diazepam": "diazepam",
  "valium": "diazepam",
  "clonazepam": "clonazepam",
  "gbl": "gbl",
  "ghb": "ghb",
  "thc": "thc",
  "cannabis": "thc",
  "weed": "thc",
  "gras": "thc",
  "marijuana": "thc",
  "nicotine": "nicotine",
  "nikotin": "nicotine",
  "tabak": "nicotine",
  "psilocybin": "psilocybin",
  "pilze": "psilocybin",
  "lsd": "lsd",
  "ketamin": "ketamin",
  "ketamine": "ketamin",
  "dxm": "dxm",
  "dextromethorphan": "dxm",
};

const CATEGORY_MAP: Record<string, SubstanceCategory> = {
  "a-pvp": "stimulant",
  "n-ethylpentedrone": "stimulant",
  "3-fluoroamphetamine": "stimulant",
  "amphetamine": "stimulant",
  "methamphetamine": "stimulant",
  "cocaine": "stimulant",
  "mdma": "stimulant",
  "4-mmc": "stimulant",
  "kratom": "opioid",
  "2-map-237": "opioid",
  "o-dsmt": "opioid",
  "tramadol": "opioid",
  "phenibut": "gabaergic",
  "etizolam": "gabaergic",
  "alprazolam": "gabaergic",
  "diazepam": "gabaergic",
  "clonazepam": "gabaergic",
  "gbl": "gabaergic",
  "ghb": "gabaergic",
  "thc": "cannabis",
  "nicotine": "nicotine",
  "psilocybin": "psychedelic",
  "lsd": "psychedelic",
  "ketamin": "dissociative",
  "dxm": "dissociative",
};

/**
 * Normalize a substance name to a canonical key.
 * Strips whitespace, lowercases, resolves aliases.
 */
export function normalizeSubstance(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return SUBSTANCE_ALIASES[key] ?? key;
}

/**
 * Classify a substance into a pharmacological category.
 */
export function classifySubstance(raw: string): SubstanceCategory {
  const normalized = normalizeSubstance(raw);
  return CATEGORY_MAP[normalized] ?? "unknown";
}
