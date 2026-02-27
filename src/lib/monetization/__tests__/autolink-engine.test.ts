import { describe, it, expect, beforeEach } from "vitest";
import { autolinkEntities } from "../autolink-engine";
import type { EntityDictionaryEntry, AutolinkConfig } from "../types";
import { DEFAULT_AUTOLINK_CONFIG } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(
  overrides: Partial<EntityDictionaryEntry> & { name: string; slug: string },
): EntityDictionaryEntry {
  return {
    entity_id: overrides.entity_id ?? `ent-${overrides.slug}`,
    name: overrides.name,
    slug: overrides.slug,
    evidence_score: overrides.evidence_score ?? 60,
    risk_level: overrides.risk_level ?? "moderate",
    monetization_enabled: overrides.monetization_enabled ?? true,
    autolink_whitelisted: overrides.autolink_whitelisted ?? false,
  };
}

function dictFrom(
  entries: EntityDictionaryEntry[],
): Map<string, EntityDictionaryEntry> {
  const dict = new Map<string, EntityDictionaryEntry>();
  for (const e of entries) {
    dict.set(e.name.toLowerCase(), e);
  }
  return dict;
}

const psilocybin = makeEntry({ name: "Psilocybin", slug: "psilocybin" });
const mdma = makeEntry({ name: "MDMA", slug: "mdma" });
const ketamin = makeEntry({ name: "Ketamin", slug: "ketamin" });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("autolinkEntities", () => {
  let dict: Map<string, EntityDictionaryEntry>;
  let config: AutolinkConfig;

  beforeEach(() => {
    dict = dictFrom([psilocybin, mdma, ketamin]);
    config = { ...DEFAULT_AUTOLINK_CONFIG };
  });

  it("returns unchanged content when dictionary is empty", () => {
    const result = autolinkEntities("Psilocybin ist gut", new Map(), config);
    expect(result.content).toBe("Psilocybin ist gut");
    expect(result.linkedEntityIds).toEqual([]);
  });

  it("returns unchanged content when source is empty", () => {
    const result = autolinkEntities("", dict, config);
    expect(result.content).toBe("");
    expect(result.linkedEntityIds).toEqual([]);
  });

  it("links the first occurrence of an entity in plain text", () => {
    const mdx = "Psilocybin ist ein Tryptamin. Psilocybin ist auch ein Prodrug.";
    const result = autolinkEntities(mdx, dict, config);
    expect(result.content).toContain("[Psilocybin](/entities/psilocybin)");
    // Only the first occurrence
    const linkCount = (result.content.match(/\[Psilocybin\]/g) || []).length;
    expect(linkCount).toBe(1);
    expect(result.linkedEntityIds).toContain("ent-psilocybin");
  });

  it("links multiple different entities on the same line", () => {
    const mdx = "Psilocybin und MDMA sind verschieden.";
    const result = autolinkEntities(mdx, dict, config);
    expect(result.content).toContain("[Psilocybin](/entities/psilocybin)");
    expect(result.content).toContain("[MDMA](/entities/mdma)");
    expect(result.linkedEntityIds).toHaveLength(2);
  });

  it("does NOT link inside headings", () => {
    const mdx = "## Psilocybin Übersicht\n\nPsilocybin ist ein Tryptamin.";
    const result = autolinkEntities(mdx, dict, config);
    // The heading line should be untouched
    expect(result.content).toMatch(/^## Psilocybin Übersicht$/m);
    // But the paragraph should be linked
    expect(result.content).toContain("[Psilocybin](/entities/psilocybin)");
  });

  it("does NOT link inside fenced code blocks", () => {
    const mdx = "```\nPsilocybin code\n```\n\nPsilocybin text.";
    const result = autolinkEntities(mdx, dict, config);
    // Code block should be untouched
    expect(result.content).toContain("Psilocybin code");
    // But the paragraph should have a link
    expect(result.content).toContain("[Psilocybin](/entities/psilocybin)");
  });

  it("does NOT link inside existing Markdown links", () => {
    const mdx = "[Psilocybin](https://example.com) ist ein Tryptamin.";
    const result = autolinkEntities(mdx, dict, config);
    // Should not double-link
    expect(result.content).not.toContain("[Psilocybin](/entities/psilocybin)");
    expect(result.content).toContain("[Psilocybin](https://example.com)");
  });

  it("does NOT link inside inline code", () => {
    const mdx = "Der Code `Psilocybin` ist hier. Psilocybin im Text.";
    const result = autolinkEntities(mdx, dict, config);
    expect(result.content).toContain("`Psilocybin`");
    expect(result.linkedEntityIds).toContain("ent-psilocybin");
  });

  it("respects the <NoAutoLink> escape hatch", () => {
    const mdx = [
      "<NoAutoLink>",
      "Psilocybin should not be linked here.",
      "</NoAutoLink>",
      "",
      "Psilocybin should be linked here.",
    ].join("\n");
    const result = autolinkEntities(mdx, dict, config);
    // The second occurrence should be linked since the first was in NoAutoLink
    expect(result.content).toContain("[Psilocybin](/entities/psilocybin)");
    // Count links - should only be 1
    const linkMatches = result.content.match(/\[Psilocybin\]\(\/entities\/psilocybin\)/g) || [];
    expect(linkMatches.length).toBe(1);
  });

  it("skips entities below the evidence score threshold", () => {
    const lowScoreEntry = makeEntry({
      name: "Psilocybin",
      slug: "psilocybin",
      evidence_score: 10,
    });
    const lowDict = dictFrom([lowScoreEntry]);
    const result = autolinkEntities("Psilocybin text", lowDict, config);
    expect(result.linkedEntityIds).toEqual([]);
    expect(result.content).toBe("Psilocybin text");
  });

  it("skips entities with monetization_enabled = false", () => {
    const noMonetEntry = makeEntry({
      name: "Psilocybin",
      slug: "psilocybin",
      monetization_enabled: false,
    });
    const noMonetDict = dictFrom([noMonetEntry]);
    const result = autolinkEntities("Psilocybin text", noMonetDict, config);
    expect(result.linkedEntityIds).toEqual([]);
  });

  it("skips high-risk entities unless whitelisted", () => {
    const highRiskEntry = makeEntry({
      name: "Psilocybin",
      slug: "psilocybin",
      risk_level: "high",
      autolink_whitelisted: false,
    });
    const hrDict = dictFrom([highRiskEntry]);

    // Default config: allowHighRisk = false
    const result = autolinkEntities("Psilocybin text", hrDict, config);
    expect(result.linkedEntityIds).toEqual([]);
  });

  it("links whitelisted high-risk entities", () => {
    const whitelistedEntry = makeEntry({
      name: "Psilocybin",
      slug: "psilocybin",
      risk_level: "high",
      autolink_whitelisted: true,
    });
    const wlDict = dictFrom([whitelistedEntry]);

    const result = autolinkEntities("Psilocybin text", wlDict, config);
    expect(result.linkedEntityIds).toContain("ent-psilocybin");
  });

  it("is case-insensitive when matching", () => {
    const mdx = "psilocybin ist ein Tryptamin.";
    const result = autolinkEntities(mdx, dict, config);
    expect(result.content).toContain("[psilocybin](/entities/psilocybin)");
    expect(result.linkedEntityIds).toContain("ent-psilocybin");
  });

  it("respects word boundaries and does not match partial words", () => {
    const mdx = "MDMAergic pathways are complex. MDMA is an empathogen.";
    const result = autolinkEntities(mdx, dict, config);
    // "MDMAergic" should NOT be linked (not a word boundary)
    // "MDMA" on its own should be linked
    expect(result.content).toContain("[MDMA](/entities/mdma)");
    expect(result.content).toContain("MDMAergic");
    // The linked one should be the standalone "MDMA"
    expect(result.linkedEntityIds).toContain("ent-mdma");
  });

  it("returns linkedEntityIds for all linked entities", () => {
    const mdx = "Psilocybin und MDMA und Ketamin.";
    const result = autolinkEntities(mdx, dict, config);
    expect(result.linkedEntityIds).toHaveLength(3);
    expect(result.linkedEntityIds).toContain("ent-psilocybin");
    expect(result.linkedEntityIds).toContain("ent-mdma");
    expect(result.linkedEntityIds).toContain("ent-ketamin");
  });

  it("handles multiline content correctly", () => {
    const mdx = [
      "## Intro",
      "",
      "Psilocybin ist ein Tryptamin.",
      "",
      "MDMA ist ein Empathogen.",
      "",
      "```",
      "Ketamin in code",
      "```",
      "",
      "Ketamin im Text.",
    ].join("\n");

    const result = autolinkEntities(mdx, dict, config);
    expect(result.content).toContain("[Psilocybin](/entities/psilocybin)");
    expect(result.content).toContain("[MDMA](/entities/mdma)");
    expect(result.content).toContain("[Ketamin](/entities/ketamin)");
    // Heading should not be modified
    expect(result.content).toContain("## Intro");
    // Code block should not be modified
    expect(result.content).toContain("Ketamin in code");
    expect(result.linkedEntityIds).toHaveLength(3);
  });
});
