import { describe, it, expect } from "vitest";
import { slugify } from "../slugify";

describe("slugify", () => {
  it("lowercases input", () => {
    expect(slugify("LSD")).toBe("lsd");
  });

  it("converts German umlauts", () => {
    expect(slugify("Lachgas")).toBe("lachgas");
    expect(slugify("Äther")).toBe("aether");
    expect(slugify("Öl")).toBe("oel");
    expect(slugify("Überdosis")).toBe("ueberdosis");
    expect(slugify("Straße")).toBe("strasse");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("5-MeO DMT")).toBe("5-meo-dmt");
  });

  it("replaces underscores with hyphens", () => {
    expect(slugify("alpha_pvp")).toBe("alpha-pvp");
  });

  it("removes parenthetical content", () => {
    expect(slugify("Alkohol (Ethanol)")).toBe("alkohol");
    expect(slugify("Kratom (Mitragynin)")).toBe("kratom");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("foo--bar")).toBe("foo-bar");
  });

  it("strips leading/trailing hyphens", () => {
    expect(slugify("-foo-")).toBe("foo");
  });

  it("handles already-clean slugs", () => {
    expect(slugify("mdma")).toBe("mdma");
    expect(slugify("psilocybin")).toBe("psilocybin");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles special chars like 4-FA", () => {
    expect(slugify("4-FA")).toBe("4-fa");
  });
});
