/**
 * Merges multiple RawSourceSubstance records (from different adapters)
 * into a single NormalizedSubstance.
 */
import { slugify } from "../slugify";
import type { RawSourceSubstance, NormalizedSubstance } from "./index";

/**
 * Compute a confidence score (0–100) based on data completeness and
 * number of agreeing sources.
 */
export function computeAdapterConfidence(raws: RawSourceSubstance[]): number {
  if (raws.length === 0) return 0;
  let score = 0;

  // Source diversity (up to 20 pts)
  score += Math.min(raws.length * 10, 20);

  // Canonical ID present (20 pts)
  const hasCanonical = raws.some((r) => r.canonicalId);
  if (hasCanonical) score += 20;

  // Description present (15 pts)
  const hasDesc = raws.some((r) => r.hasDescription);
  if (hasDesc) score += 15;

  // Chemistry data present (20 pts)
  const hasChem = raws.some((r) => r.hasChem);
  if (hasChem) score += 20;

  // Classification present (15 pts)
  const hasClass = raws.some(
    (r) => (r.drugClass?.length ?? 0) > 0 || (r.tags?.length ?? 0) > 0,
  );
  if (hasClass) score += 15;

  // Consistency: canonical IDs agree across sources (10 pts)
  const canonicals = raws.map((r) => r.canonicalId).filter(Boolean);
  if (canonicals.length >= 2) {
    const allAgree = canonicals.every((c) => c === canonicals[0]);
    if (allAgree) score += 10;
  }

  return Math.min(100, score);
}

/**
 * Auto-verify if >=2 high-trust sources agree on the canonical ID.
 */
function computeVerificationStatus(
  raws: RawSourceSubstance[],
  confidence: number,
): NormalizedSubstance["verificationStatus"] {
  const highTrustSources = raws.filter(
    (r) => r.sourceId === "wikidata" || r.sourceId === "pubchem",
  );
  if (
    highTrustSources.length >= 2 &&
    highTrustSources[0].canonicalId &&
    highTrustSources[0].canonicalId === highTrustSources[1]?.canonicalId &&
    confidence >= 60
  ) {
    return "auto_verified";
  }
  return "unverified";
}

export function mergeRawSources(
  primaryName: string,
  raws: RawSourceSubstance[],
): NormalizedSubstance {
  const confidence = computeAdapterConfidence(raws);

  // Pick best values from sources (prefer wikidata for meta, pubchem for chem)
  const wikiRaw = raws.find((r) => r.sourceId === "wikidata");
  const pubRaw = raws.find((r) => r.sourceId === "pubchem");
  const anyRaw = raws[0];

  const name = wikiRaw?.name ?? anyRaw?.name ?? primaryName;
  const aliases = Array.from(
    new Set([
      ...(wikiRaw?.aliases ?? []),
      ...(pubRaw?.aliases?.slice(0, 10) ?? []),
    ]),
  ).slice(0, 30);

  const canonicalId =
    pubRaw?.inchiKey ??
    wikiRaw?.inchiKey ??
    wikiRaw?.wikidataQid ??
    anyRaw?.canonicalId;

  const tags = Array.from(
    new Set([
      ...(wikiRaw?.tags ?? []),
      ...(wikiRaw?.drugClass ?? []),
      ...(anyRaw?.tags ?? []),
    ]),
  );

  const sources = raws.map((r) => {
    const fields: string[] = [];
    if (r.hasDescription) fields.push("summary");
    if (r.hasChem) fields.push("chemistry");
    if ((r.aliases?.length ?? 0) > 0) fields.push("aliases");
    if ((r.drugClass?.length ?? 0) > 0) fields.push("class");
    if (r.casNumber) fields.push("cas");
    return {
      sourceId: r.sourceId,
      sourceUrl: r.sourceUrl,
      retrievedAt: r.retrievedAt,
      fields,
    };
  });

  return {
    slug: slugify(primaryName),
    name,
    canonicalId,
    aliases,
    category: wikiRaw?.category ?? anyRaw?.category,
    tags,
    summary: wikiRaw?.summary ?? anyRaw?.summary,
    molecularFormula: pubRaw?.molecularFormula ?? wikiRaw?.molecularFormula,
    inchiKey: pubRaw?.inchiKey ?? wikiRaw?.inchiKey,
    smiles: pubRaw?.smiles ?? wikiRaw?.smiles,
    pubchemCid: pubRaw?.pubchemCid,
    confidenceScore: confidence,
    verificationStatus: computeVerificationStatus(raws, confidence),
    sources,
    lastImportedAt: new Date().toISOString(),
  };
}
