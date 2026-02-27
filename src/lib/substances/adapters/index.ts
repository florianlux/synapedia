/**
 * Source Adapter architecture for the substance import pipeline.
 *
 * Each adapter wraps a single external data source and normalises its
 * output into `RawSourceSubstance`.  The pipeline then merges multiple
 * raw results into a single `NormalizedSubstance`.
 */

export interface RawSourceSubstance {
  /** Adapter that produced this record */
  sourceId: string;
  /** Canonical URL for the record in the source */
  sourceUrl: string;
  /** ISO timestamp of retrieval */
  retrievedAt: string;

  // Identity
  name: string;
  aliases?: string[];
  wikidataQid?: string;
  canonicalId?: string; // prefer InChIKey or wikidataQid

  // Classification
  drugClass?: string[];
  tags?: string[];
  category?: string;

  // Chem identifiers
  inchiKey?: string;
  inchi?: string;
  smiles?: string;
  molecularFormula?: string;
  exactMass?: number;
  iupacName?: string;
  pubchemCid?: number;
  casNumber?: string;

  // Content
  summary?: string;
  pharmacology?: string;

  // Confidence helpers
  hasDescription: boolean;
  hasChem: boolean;
}

export interface NormalizedSubstance {
  slug: string;
  name: string;
  canonicalId?: string;
  aliases: string[];
  category?: string;
  tags: string[];
  summary?: string;
  molecularFormula?: string;
  inchiKey?: string;
  smiles?: string;
  pubchemCid?: number;
  confidenceScore: number;
  verificationStatus: "unverified" | "auto_verified" | "verified";
  sources: Array<{
    sourceId: string;
    sourceUrl: string;
    retrievedAt: string;
    fields: string[];
  }>;
  lastImportedAt: string;
}

export interface SourceAdapter {
  id: string;
  label: string;
  enabled: boolean;
  supportsSearch: boolean;
  supportsBulk: boolean;
  search(query: string): Promise<RawSourceSubstance[]>;
  fetchById(id: string): Promise<RawSourceSubstance | null>;
  fetchBulk(ids: string[]): Promise<RawSourceSubstance[]>;
}
