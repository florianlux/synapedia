import { describe, it, expect } from "vitest";
import {
  toNullableNumber,
  toTextArray,
  sanitizeSubstanceValues,
} from "../normalize";

/* ============ toNullableNumber ============ */

describe("toNullableNumber", () => {
  it("returns null for null/undefined", () => {
    expect(toNullableNumber(null)).toBeNull();
    expect(toNullableNumber(undefined)).toBeNull();
  });

  it('returns null for empty object {} (the "{}" bug)', () => {
    expect(toNullableNumber({})).toBeNull();
  });

  it("returns null for empty array []", () => {
    expect(toNullableNumber([])).toBeNull();
  });

  it("returns null for non-empty objects", () => {
    expect(toNullableNumber({ a: 1 })).toBeNull();
  });

  it('returns null for "" / "N/A" / "-"', () => {
    expect(toNullableNumber("")).toBeNull();
    expect(toNullableNumber("N/A")).toBeNull();
    expect(toNullableNumber("-")).toBeNull();
  });

  it("returns the number for finite numbers", () => {
    expect(toNullableNumber(0)).toBe(0);
    expect(toNullableNumber(42)).toBe(42);
    expect(toNullableNumber(-3.14)).toBe(-3.14);
  });

  it("returns null for NaN / Infinity", () => {
    expect(toNullableNumber(NaN)).toBeNull();
    expect(toNullableNumber(Infinity)).toBeNull();
    expect(toNullableNumber(-Infinity)).toBeNull();
  });

  it("parses string numbers", () => {
    expect(toNullableNumber("42")).toBe(42);
    expect(toNullableNumber("3.14")).toBe(3.14);
    expect(toNullableNumber(" 100 ")).toBe(100);
  });

  it("returns null for non-numeric strings", () => {
    expect(toNullableNumber("abc")).toBeNull();
    expect(toNullableNumber("12px")).toBeNull(); // strict: rejects partial numeric strings
  });

  it("returns null for booleans", () => {
    expect(toNullableNumber(true)).toBeNull();
    expect(toNullableNumber(false)).toBeNull();
  });
});

/* ============ toTextArray ============ */

describe("toTextArray", () => {
  it("returns [] for null/undefined", () => {
    expect(toTextArray(null)).toEqual([]);
    expect(toTextArray(undefined)).toEqual([]);
  });

  it("returns [] for empty object {}", () => {
    expect(toTextArray({})).toEqual([]);
  });

  it("wraps a non-empty string in an array", () => {
    expect(toTextArray("hello")).toEqual(["hello"]);
  });

  it("returns [] for empty string", () => {
    expect(toTextArray("")).toEqual([]);
  });

  it("passes through string arrays, filtering blanks", () => {
    expect(toTextArray(["a", "", "b"])).toEqual(["a", "b"]);
  });

  it("stringifies non-string array elements", () => {
    expect(toTextArray([1, null, "ok"])).toEqual(["1", "ok"]);
  });

  it("returns [] for numbers and booleans", () => {
    expect(toTextArray(42)).toEqual([]);
    expect(toTextArray(true)).toEqual([]);
  });
});

/* ============ sanitizeSubstanceValues ============ */

describe("sanitizeSubstanceValues", () => {
  it("converts {} in confidence_score to null", () => {
    const payload = { confidence_score: {}, name: "Test" };
    const result = sanitizeSubstanceValues(payload);
    expect(result.confidence_score).toBeNull();
    expect(result.name).toBe("Test");
  });

  it("converts {} in pubchem_cid to null", () => {
    const payload = { pubchem_cid: {} };
    const result = sanitizeSubstanceValues(payload);
    expect(result.pubchem_cid).toBeNull();
  });

  it("keeps valid numbers in numeric columns", () => {
    const payload = { confidence_score: 75, pubchem_cid: 12345 };
    const result = sanitizeSubstanceValues(payload);
    expect(result.confidence_score).toBe(75);
    expect(result.pubchem_cid).toBe(12345);
  });

  it("parses string numbers in numeric columns", () => {
    const payload = { confidence_score: "42" };
    const result = sanitizeSubstanceValues(payload);
    expect(result.confidence_score).toBe(42);
  });

  it("normalises text array columns", () => {
    const payload = { tags: {} };
    const result = sanitizeSubstanceValues(payload);
    expect(result.tags).toEqual([]);
  });

  it("preserves valid text array columns", () => {
    const payload = { tags: ["a", "b"], related_slugs: ["x"] };
    const result = sanitizeSubstanceValues(payload);
    expect(result.tags).toEqual(["a", "b"]);
    expect(result.related_slugs).toEqual(["x"]);
  });

  it("preserves JSONB columns as-is (even {})", () => {
    const payload = { confidence: {}, enrichment: { pubchem: {} }, meta: {} };
    const result = sanitizeSubstanceValues(payload);
    expect(result.confidence).toEqual({});
    expect(result.enrichment).toEqual({ pubchem: {} });
    expect(result.meta).toEqual({});
  });

  it("converts N/A in text columns to null", () => {
    const payload = { name: "Test", summary: "N/A", mechanism: "-" };
    const result = sanitizeSubstanceValues(payload);
    expect(result.name).toBe("Test");
    expect(result.summary).toBeNull();
    expect(result.mechanism).toBeNull();
  });

  it("converts object values in text columns to null", () => {
    const payload = { status: {} };
    const result = sanitizeSubstanceValues(payload);
    expect(result.status).toBeNull();
  });

  it("nullifies junk values in unknown columns as a safety net", () => {
    const payload = { unknown_column: {} };
    const result = sanitizeSubstanceValues(payload);
    expect(result.unknown_column).toBeNull();
  });

  it("handles a realistic import-engine row without errors", () => {
    const row = {
      name: "Psilocybin",
      slug: "psilocybin",
      canonical_name: "Psilocybin",
      summary: "",
      status: "draft",
      categories: [],
      mechanism: "",
      effects: { positive: [], neutral: [], negative: [] },
      risks: { acute: [], chronic: [], contraindications: [] },
      interactions: { high_risk_pairs: [], notes: [] },
      dependence: { potential: "unknown", notes: [] },
      legality: { germany: "unknown", notes: [] },
      citations: {},
      confidence: {},
      tags: [],
      related_slugs: [],
      external_ids: { wikidata: "Q12345" },
      enrichment: {},
      meta: { qid: "Q12345", confidence_score: 30 },
    };
    const result = sanitizeSubstanceValues(row);

    // Verify structure is preserved
    expect(result.name).toBe("Psilocybin");
    expect(result.tags).toEqual([]);
    expect(result.confidence).toEqual({});
    expect(result.meta).toEqual({ qid: "Q12345", confidence_score: 30 });
  });
});
