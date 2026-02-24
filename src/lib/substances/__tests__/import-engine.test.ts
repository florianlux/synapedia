import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// PubChem hardened connector tests
// ---------------------------------------------------------------------------

describe("fetchPubChemHardened", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("should return not_found on 404 without throwing", async () => {
    const { fetchPubChemHardened } = await import("../pubchem-hardened");

    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("", { status: 404 }),
    );

    const result = await fetchPubChemHardened("NonExistentSubstance", 99999999);
    expect(result.status).toBe("not_found");
    expect(result.data).toBeNull();
    // Should NOT throw
  });

  it("should return error on network failure without throwing", async () => {
    const { fetchPubChemHardened } = await import("../pubchem-hardened");

    vi.mocked(globalThis.fetch).mockRejectedValue(new Error("Network failure"));

    const result = await fetchPubChemHardened("TestSubstance", 12345);
    expect(result.status).toBe("error");
    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
  });

  it("should return not_found when CID is 0 and name lookup fails", async () => {
    const { fetchPubChemHardened } = await import("../pubchem-hardened");

    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("", { status: 404 }),
    );

    const result = await fetchPubChemHardened("Unknown", 0);
    expect(result.status).toBe("not_found");
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Confidence score tests
// ---------------------------------------------------------------------------

describe("computeConfidenceScore", () => {
  it("should return 0 for empty data", async () => {
    const { computeConfidenceScore } = await import("../import-engine");

    const score = computeConfidenceScore({
      hasWikidata: false,
      hasPubChem: false,
      hasAiEnrichment: false,
      aiStatus: "skipped",
      pubchemStatus: "skipped",
      hasSynonyms: false,
      hasDescription: false,
      hasMolecularFormula: false,
    });
    expect(score).toBe(0);
  });

  it("should give 20 points for wikidata only", async () => {
    const { computeConfidenceScore } = await import("../import-engine");

    const score = computeConfidenceScore({
      hasWikidata: true,
      hasPubChem: false,
      hasAiEnrichment: false,
      aiStatus: "skipped",
      pubchemStatus: "skipped",
      hasSynonyms: false,
      hasDescription: false,
      hasMolecularFormula: false,
    });
    expect(score).toBe(20);
  });

  it("should give 30 points for wikidata + description", async () => {
    const { computeConfidenceScore } = await import("../import-engine");

    const score = computeConfidenceScore({
      hasWikidata: true,
      hasPubChem: false,
      hasAiEnrichment: false,
      aiStatus: "skipped",
      pubchemStatus: "skipped",
      hasSynonyms: false,
      hasDescription: true,
      hasMolecularFormula: false,
    });
    expect(score).toBe(30);
  });

  it("should give full 100 for complete data", async () => {
    const { computeConfidenceScore } = await import("../import-engine");

    const score = computeConfidenceScore({
      hasWikidata: true,
      hasPubChem: true,
      hasAiEnrichment: true,
      aiStatus: "ok",
      pubchemStatus: "ok",
      hasSynonyms: true,
      hasDescription: true,
      hasMolecularFormula: true,
    });
    expect(score).toBe(100);
  });

  it("should give reduced score for failed AI", async () => {
    const { computeConfidenceScore } = await import("../import-engine");

    const score = computeConfidenceScore({
      hasWikidata: true,
      hasPubChem: true,
      hasAiEnrichment: true,
      aiStatus: "failed",
      pubchemStatus: "ok",
      hasSynonyms: true,
      hasDescription: true,
      hasMolecularFormula: true,
    });
    // 20 + 10 + 15 + 10 + 5 + 15 (failed ai) = 75
    expect(score).toBe(75);
  });

  it("should cap at 100", async () => {
    const { computeConfidenceScore } = await import("../import-engine");

    const score = computeConfidenceScore({
      hasWikidata: true,
      hasPubChem: true,
      hasAiEnrichment: true,
      aiStatus: "ok",
      pubchemStatus: "ok",
      hasSynonyms: true,
      hasDescription: true,
      hasMolecularFormula: true,
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
