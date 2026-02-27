import { describe, it, expect, beforeEach } from "vitest";
import {
  buildEntityDictionary,
  getEntityDictionary,
  clearEntityDictionaryCache,
} from "../entity-dictionary";
import type { EntityDictionaryEntry } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(
  overrides: Partial<EntityDictionaryEntry> & { name: string; slug: string },
): EntityDictionaryEntry & { synonyms: string[] } {
  return {
    entity_id: overrides.entity_id ?? `ent-${overrides.slug}`,
    name: overrides.name,
    slug: overrides.slug,
    evidence_score: overrides.evidence_score ?? 60,
    risk_level: overrides.risk_level ?? "moderate",
    monetization_enabled: overrides.monetization_enabled ?? true,
    autolink_whitelisted: overrides.autolink_whitelisted ?? false,
    synonyms: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildEntityDictionary", () => {
  it("maps entity name (lowercased) to entry", () => {
    const entries = [makeEntry({ name: "Psilocybin", slug: "psilocybin" })];
    const dict = buildEntityDictionary(entries);
    expect(dict.has("psilocybin")).toBe(true);
    expect(dict.get("psilocybin")?.entity_id).toBe("ent-psilocybin");
  });

  it("maps entity slug to entry", () => {
    const entries = [makeEntry({ name: "Alpha-PVP", slug: "alpha-pvp" })];
    const dict = buildEntityDictionary(entries);
    expect(dict.has("alpha-pvp")).toBe(true);
  });

  it("maps synonyms to entity", () => {
    const entry = {
      ...makeEntry({ name: "MDMA", slug: "mdma" }),
      synonyms: ["Ecstasy", "Molly"],
    };
    const dict = buildEntityDictionary([entry]);
    expect(dict.has("mdma")).toBe(true);
    expect(dict.has("ecstasy")).toBe(true);
    expect(dict.has("molly")).toBe(true);
    // All map to the same entity
    expect(dict.get("ecstasy")?.entity_id).toBe("ent-mdma");
    expect(dict.get("molly")?.entity_id).toBe("ent-mdma");
  });

  it("prefers higher evidence_score on key collision", () => {
    const lowScore = makeEntry({
      name: "Ketamin",
      slug: "ketamin-low",
      entity_id: "ent-low",
      evidence_score: 30,
    });
    const highScore = makeEntry({
      name: "Ketamin",
      slug: "ketamin-high",
      entity_id: "ent-high",
      evidence_score: 80,
    });
    // Insert low first, then high — high should win
    const dict = buildEntityDictionary([lowScore, highScore]);
    expect(dict.get("ketamin")?.entity_id).toBe("ent-high");
  });

  it("returns empty map for empty input", () => {
    const dict = buildEntityDictionary([]);
    expect(dict.size).toBe(0);
  });

  it("skips blank synonyms", () => {
    const entry = {
      ...makeEntry({ name: "LSD", slug: "lsd" }),
      synonyms: ["", "  ", "Acid"],
    };
    const dict = buildEntityDictionary([entry]);
    expect(dict.has("")).toBe(false);
    expect(dict.has("acid")).toBe(true);
  });
});

describe("getEntityDictionary (caching)", () => {
  beforeEach(() => {
    clearEntityDictionaryCache();
  });

  it("returns empty map when no loader and no cache", async () => {
    const dict = await getEntityDictionary();
    expect(dict.size).toBe(0);
  });

  it("invokes loader on first call", async () => {
    let callCount = 0;
    const loader = async () => {
      callCount++;
      return [makeEntry({ name: "Psilocybin", slug: "psilocybin" })];
    };

    const dict = await getEntityDictionary(loader);
    expect(dict.has("psilocybin")).toBe(true);
    expect(callCount).toBe(1);
  });

  it("returns cached dictionary on second call within TTL", async () => {
    let callCount = 0;
    const loader = async () => {
      callCount++;
      return [makeEntry({ name: "Psilocybin", slug: "psilocybin" })];
    };

    await getEntityDictionary(loader);
    await getEntityDictionary(loader);
    expect(callCount).toBe(1); // Only called once
  });

  it("clears cache when clearEntityDictionaryCache is called", async () => {
    let callCount = 0;
    const loader = async () => {
      callCount++;
      return [makeEntry({ name: "Psilocybin", slug: "psilocybin" })];
    };

    await getEntityDictionary(loader);
    clearEntityDictionaryCache();
    await getEntityDictionary(loader);
    expect(callCount).toBe(2); // Called twice after clear
  });
});
