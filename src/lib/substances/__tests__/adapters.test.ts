import { describe, it, expect } from "vitest";
import { mergeRawSources, computeAdapterConfidence } from "../adapters/normalize";
import type { RawSourceSubstance } from "../adapters/index";

const mockWikidataRaw: RawSourceSubstance = {
  sourceId: "wikidata",
  sourceUrl: "https://www.wikidata.org/wiki/Q407544",
  retrievedAt: "2024-01-01T00:00:00.000Z",
  name: "Psilocybin",
  aliases: ["magic mushroom compound"],
  wikidataQid: "Q407544",
  canonicalId: "QIIKUNPZNLNKDS-YPZZEJLDSA-N",
  inchiKey: "QIIKUNPZNLNKDS-YPZZEJLDSA-N",
  drugClass: ["psychedelic", "tryptamine"],
  summary: "A naturally occurring psychedelic prodrug",
  hasDescription: true,
  hasChem: true,
};

const mockPubChemRaw: RawSourceSubstance = {
  sourceId: "pubchem",
  sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/10624",
  retrievedAt: "2024-01-01T00:00:00.000Z",
  name: "[3-[2-(dimethylamino)ethyl]-1H-indol-4-yl] dihydrogen phosphate",
  aliases: ["Psilocybin", "Indocybin"],
  canonicalId: "QIIKUNPZNLNKDS-YPZZEJLDSA-N",
  inchiKey: "QIIKUNPZNLNKDS-YPZZEJLDSA-N",
  molecularFormula: "C12H17N2O4P",
  pubchemCid: 10624,
  hasDescription: true,
  hasChem: true,
};

describe("computeAdapterConfidence", () => {
  it("returns 0 for empty sources", () => {
    expect(computeAdapterConfidence([])).toBe(0);
  });

  it("gives partial score for single source with description", () => {
    const score = computeAdapterConfidence([mockWikidataRaw]);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("gives higher score for multiple agreeing sources", () => {
    const single = computeAdapterConfidence([mockWikidataRaw]);
    const multi = computeAdapterConfidence([mockWikidataRaw, mockPubChemRaw]);
    expect(multi).toBeGreaterThan(single);
  });

  it("caps at 100", () => {
    const score = computeAdapterConfidence([mockWikidataRaw, mockPubChemRaw]);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("mergeRawSources", () => {
  it("produces a NormalizedSubstance from a single wikidata source", () => {
    const result = mergeRawSources("Psilocybin", [mockWikidataRaw]);
    expect(result.slug).toBe("psilocybin");
    expect(result.name).toBe("Psilocybin");
    expect(result.canonicalId).toBe("QIIKUNPZNLNKDS-YPZZEJLDSA-N");
    expect(result.confidenceScore).toBeGreaterThan(0);
    expect(result.verificationStatus).toBe("unverified");
    expect(result.sources).toHaveLength(1);
  });

  it("merges wikidata + pubchem sources", () => {
    const result = mergeRawSources("Psilocybin", [mockWikidataRaw, mockPubChemRaw]);
    expect(result.sources).toHaveLength(2);
    expect(result.molecularFormula).toBe("C12H17N2O4P");
    expect(result.pubchemCid).toBe(10624);
    // Both sources have same inchiKey, so auto_verified
    expect(result.verificationStatus).toBe("auto_verified");
  });

  it("handles empty sources gracefully", () => {
    const result = mergeRawSources("Unknown", []);
    expect(result.slug).toBe("unknown");
    expect(result.name).toBe("Unknown");
    expect(result.confidenceScore).toBe(0);
    expect(result.sources).toHaveLength(0);
  });

  it("generates correct slug for German names", () => {
    const result = mergeRawSources("Überdosis Ärger", []);
    expect(result.slug).toBe("ueberdosis-aerger");
  });
});
