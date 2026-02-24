/**
 * Enrichment pipeline: generates structured summaries and crosslinks
 * from PubChem/ChEMBL data. RAG-only approach (no LLM generation).
 */

import type { PubChemFacts, ChEMBLTarget } from "./enrichment-connectors";
import { contentSafetyFilter } from "./content-safety";
import { canonicalSlug } from "./canonicalize";

/* ============ Structured Summary ============ */

export interface StructuredSummary {
  overview: string;
  mechanismBullets: string[];
  effectsHighLevel: string[];
  risksEducational: string[];
  evidenceLevel: string;
  legalPlaceholder: string;
}

/**
 * Build a structured summary from PubChem + ChEMBL facts.
 * Strictly educational/medical tone. No dosing, routes, or synthesis.
 */
export function buildStructuredSummary(
  name: string,
  pubchem: PubChemFacts | null,
  targets: ChEMBLTarget[],
  categories: string[]
): StructuredSummary {
  // Overview
  const formulaPart = pubchem?.molecularFormula ? ` (${pubchem.molecularFormula})` : "";
  const weightPart = pubchem?.molecularWeight ? `, molecular weight ${pubchem.molecularWeight}` : "";
  const classPart = categories.length > 0 ? ` classified as ${categories.join(", ")}` : "";
  const overview = `${name}${formulaPart} is a pharmacologically active substance${classPart}${weightPart}. ` +
    (pubchem?.iupacName ? `IUPAC name: ${pubchem.iupacName}. ` : "") +
    "This entry is auto-generated from public databases and requires expert review.";

  // Mechanism bullets from ChEMBL targets
  const mechanismBullets: string[] = [];
  for (const t of targets) {
    const action = t.action ? `${t.action} at` : "Interacts with";
    mechanismBullets.push(`${action} ${t.targetName} (${t.targetType})`);
  }
  if (mechanismBullets.length === 0) {
    mechanismBullets.push("Mechanism data not yet available from automated sources");
  }

  // High-level effects (neutral)
  const effectsHighLevel: string[] = [];
  if (targets.some((t) => t.targetName.toLowerCase().includes("serotonin"))) {
    effectsHighLevel.push("May affect serotonergic signaling");
  }
  if (targets.some((t) => t.targetName.toLowerCase().includes("dopamine"))) {
    effectsHighLevel.push("May affect dopaminergic signaling");
  }
  if (targets.some((t) => t.targetName.toLowerCase().includes("gaba"))) {
    effectsHighLevel.push("May affect GABAergic signaling");
  }
  if (targets.some((t) => t.targetName.toLowerCase().includes("opioid"))) {
    effectsHighLevel.push("May affect opioid receptor signaling");
  }
  if (targets.some((t) => t.targetName.toLowerCase().includes("nmda") || t.targetName.toLowerCase().includes("glutamate"))) {
    effectsHighLevel.push("May affect glutamatergic/NMDA signaling");
  }
  if (effectsHighLevel.length === 0) {
    effectsHighLevel.push("Detailed effects require expert review of primary literature");
  }

  // Risks (educational)
  const risksEducational = [
    "Adverse effects and contraindications should be reviewed by qualified professionals",
    "Drug interactions may occur — consult medical databases for specific pairs",
  ];

  // Evidence level
  const evidenceLevel = targets.length > 0
    ? "Preclinical and/or clinical data available in ChEMBL"
    : "Limited automated data — manual literature review recommended";

  // Legal placeholder
  const legalPlaceholder = "Legal status varies by jurisdiction. Consult local regulations.";

  return {
    overview: applySafetyFilter(overview),
    mechanismBullets: mechanismBullets.map(applySafetyFilter),
    effectsHighLevel: effectsHighLevel.map(applySafetyFilter),
    risksEducational: risksEducational.map(applySafetyFilter),
    evidenceLevel,
    legalPlaceholder,
  };
}

function applySafetyFilter(text: string): string {
  const result = contentSafetyFilter(text);
  return result.clean;
}

/* ============ Tag Classification ============ */

const TARGET_TO_CLASS: Record<string, string> = {
  "serotonin": "serotonergic",
  "5-ht": "serotonergic",
  "dopamine": "dopaminergic",
  "norepinephrine": "noradrenergic",
  "noradrenaline": "noradrenergic",
  "gaba": "gabaergic",
  "opioid": "opioid",
  "mu-opioid": "opioid",
  "kappa-opioid": "opioid",
  "delta-opioid": "opioid",
  "nmda": "glutamatergic",
  "glutamate": "glutamatergic",
  "acetylcholine": "cholinergic",
  "nicotinic": "cholinergic",
  "muscarinic": "cholinergic",
  "cannabinoid": "cannabinoid",
  "histamine": "histaminergic",
  "adrenergic": "adrenergic",
};

/**
 * Auto-classify substance tags based on its targets.
 */
export function classifyTags(
  targets: ChEMBLTarget[],
  existingCategories: string[]
): string[] {
  const tags = new Set<string>(existingCategories);

  for (const target of targets) {
    const name = target.targetName.toLowerCase();
    for (const [keyword, classification] of Object.entries(TARGET_TO_CLASS)) {
      if (name.includes(keyword)) {
        tags.add(classification);
      }
    }
  }

  return Array.from(tags);
}

/* ============ Crosslinking ============ */

export interface CrosslinkResult {
  relatedSlugs: string[];
  tags: string[];
}

/**
 * Compute related substances by shared targets/classes.
 * Takes a map of slug → tags for all known substances.
 */
export function computeCrosslinks(
  currentSlug: string,
  currentTags: string[],
  allSubstances: Array<{ slug: string; tags: string[] }>
): CrosslinkResult {
  const relatedSlugs: string[] = [];
  const currentTagSet = new Set(currentTags);

  for (const other of allSubstances) {
    if (other.slug === currentSlug) continue;
    const shared = other.tags.filter((t) => currentTagSet.has(t));
    if (shared.length > 0) {
      relatedSlugs.push(other.slug);
    }
  }

  // Limit to 10 most related
  return {
    relatedSlugs: relatedSlugs.slice(0, 10),
    tags: currentTags,
  };
}

/**
 * Auto-link receptor names in text to internal pages.
 * Wraps known receptor names in markdown-style links.
 */
const RECEPTOR_PAGES: Record<string, string> = {
  "5-HT2A": "/glossary/5-ht2a-receptor",
  "5-HT1A": "/glossary/5-ht1a-receptor",
  "D1": "/glossary/d1-receptor",
  "D2": "/glossary/d2-receptor",
  "GABA-A": "/glossary/gaba-a-receptor",
  "GABA-B": "/glossary/gaba-b-receptor",
  "NMDA": "/glossary/nmda-receptor",
  "mu-opioid": "/glossary/mu-opioid-receptor",
  "kappa-opioid": "/glossary/kappa-opioid-receptor",
  "CB1": "/glossary/cb1-receptor",
  "CB2": "/glossary/cb2-receptor",
};

export function autoLinkReceptors(text: string): string {
  let result = text;
  for (const [receptor, path] of Object.entries(RECEPTOR_PAGES)) {
    const escapedReceptor = receptor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedReceptor}\\b`, "g");
    result = result.replace(regex, `[${receptor}](${path})`);
  }
  return result;
}

/* ============ Enrichment Data Assembly ============ */

export interface EnrichmentData {
  external_ids: Record<string, string | number>;
  canonical_name: string;
  tags: string[];
  related_slugs: string[];
  summary: string;
  mechanism: string;
  enrichment: {
    pubchem: PubChemFacts | null;
    chembl_targets: ChEMBLTarget[];
    structured_summary: StructuredSummary;
    enriched_at: string;
  };
}

/**
 * Assemble all enrichment data for a substance into an update payload.
 */
export function assembleEnrichmentData(
  name: string,
  slug: string,
  pubchem: PubChemFacts | null,
  targets: ChEMBLTarget[],
  existingCategories: string[],
  allSubstances: Array<{ slug: string; tags: string[] }>
): EnrichmentData {
  const tags = classifyTags(targets, existingCategories);
  const summary = buildStructuredSummary(name, pubchem, targets, existingCategories);
  const crosslinks = computeCrosslinks(slug, tags, allSubstances);

  const external_ids: Record<string, string | number> = {};
  if (pubchem?.cid) external_ids.pubchem_cid = pubchem.cid;

  const mechanismText = autoLinkReceptors(summary.mechanismBullets.join("\n• "));

  return {
    external_ids,
    canonical_name: canonicalSlug(name) === slug ? name : name,
    tags,
    related_slugs: crosslinks.relatedSlugs,
    summary: summary.overview,
    mechanism: mechanismText ? `• ${mechanismText}` : "",
    enrichment: {
      pubchem,
      chembl_targets: targets,
      structured_summary: summary,
      enriched_at: new Date().toISOString(),
    },
  };
}
