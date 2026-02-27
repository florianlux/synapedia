import { describe, it, expect } from "vitest";
import { getBestAffiliateLinks } from "../affiliate-routing";
import type {
  AffiliateProvider,
  EntityProviderLink,
  AffiliateLinkQuery,
} from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProvider(
  overrides: Partial<AffiliateProvider> & { id: string; name: string },
): AffiliateProvider {
  return {
    slug: overrides.name.toLowerCase().replace(/\s+/g, "-"),
    website_url: `https://${overrides.name.toLowerCase().replace(/\s+/g, "")}.com`,
    logo_url: null,
    description: null,
    verified: false,
    active: true,
    quality_score: 50,
    region: "global",
    price_range: null,
    affiliate_tag: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeLink(
  overrides: Partial<EntityProviderLink> & {
    entity_id: string;
    provider_id: string;
  },
): EntityProviderLink {
  return {
    id: `link-${overrides.entity_id}-${overrides.provider_id}`,
    affiliate_url: `https://example.com/aff/${overrides.provider_id}`,
    custom_label: null,
    priority: 0,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const entityId = "ent-psilocybin";

const providerA = makeProvider({
  id: "p-alpha",
  name: "Alpha Labs",
  verified: true,
  quality_score: 90,
  region: "EU",
  price_range: "mid",
});

const providerB = makeProvider({
  id: "p-beta",
  name: "Beta Chem",
  verified: false,
  quality_score: 70,
  region: "global",
  price_range: "budget",
});

const providerC = makeProvider({
  id: "p-gamma",
  name: "Gamma Supply",
  verified: true,
  quality_score: 80,
  region: "US",
  price_range: "premium",
});

const providerInactive = makeProvider({
  id: "p-inactive",
  name: "Dead Vendor",
  active: false,
  quality_score: 95,
});

const linkA = makeLink({ entity_id: entityId, provider_id: "p-alpha" });
const linkB = makeLink({ entity_id: entityId, provider_id: "p-beta" });
const linkC = makeLink({ entity_id: entityId, provider_id: "p-gamma" });
const linkInactive = makeLink({
  entity_id: entityId,
  provider_id: "p-inactive",
});
const linkDeactivated = makeLink({
  entity_id: entityId,
  provider_id: "p-alpha",
  active: false,
});

const allProviders = [providerA, providerB, providerC, providerInactive];
const allLinks = [linkA, linkB, linkC, linkInactive];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getBestAffiliateLinks", () => {
  it("returns empty array when no links exist", () => {
    const result = getBestAffiliateLinks(
      { entityId },
      allProviders,
      [],
    );
    expect(result).toEqual([]);
  });

  it("returns empty array when no providers are active", () => {
    const result = getBestAffiliateLinks(
      { entityId },
      [providerInactive],
      [linkInactive],
    );
    expect(result).toEqual([]);
  });

  it("filters out inactive links", () => {
    const result = getBestAffiliateLinks(
      { entityId },
      [providerA],
      [linkDeactivated],
    );
    expect(result).toEqual([]);
  });

  it("returns ranked links sorted by score descending", () => {
    const result = getBestAffiliateLinks(
      { entityId },
      allProviders,
      allLinks,
    );
    // All active providers should appear
    expect(result.length).toBe(3);
    // Alpha Labs should rank highest (verified + high quality)
    expect(result[0].provider.id).toBe("p-alpha");
    // Scores should be descending
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it("applies region match bonus", () => {
    const query: AffiliateLinkQuery = { entityId, region: "EU" };
    const result = getBestAffiliateLinks(query, allProviders, allLinks);
    // Alpha Labs (EU) should get region bonus and rank first
    expect(result[0].provider.id).toBe("p-alpha");
    // Gamma Supply (US) gets region penalty but is verified (+20) and higher quality (80)
    // Beta Chem (global) has no region penalty but lower quality (70) and not verified
    const alphaResult = result.find((r) => r.provider.id === "p-alpha");
    const gammaResult = result.find((r) => r.provider.id === "p-gamma");
    // Alpha (EU match) should score higher than Gamma (US mismatch)
    expect(alphaResult!.score).toBeGreaterThan(gammaResult!.score);
  });

  it("respects requireVerified filter", () => {
    const query: AffiliateLinkQuery = { entityId, requireVerified: true };
    const result = getBestAffiliateLinks(query, allProviders, allLinks);
    // Only verified providers: Alpha Labs and Gamma Supply
    expect(result.length).toBe(2);
    expect(result.every((r) => r.provider.verified)).toBe(true);
  });

  it("respects minQuality filter", () => {
    const query: AffiliateLinkQuery = { entityId, minQuality: 75 };
    const result = getBestAffiliateLinks(query, allProviders, allLinks);
    // Only providers with quality >= 75: Alpha (90) and Gamma (80)
    expect(result.length).toBe(2);
    expect(result.every((r) => r.provider.quality_score >= 75)).toBe(true);
  });

  it("respects limit parameter", () => {
    const query: AffiliateLinkQuery = { entityId, limit: 1 };
    const result = getBestAffiliateLinks(query, allProviders, allLinks);
    expect(result.length).toBe(1);
  });

  it("defaults limit to 3", () => {
    const manyProviders = Array.from({ length: 5 }, (_, i) =>
      makeProvider({
        id: `p-${i}`,
        name: `Provider ${i}`,
        quality_score: 50 + i,
      }),
    );
    const manyLinks = manyProviders.map((p) =>
      makeLink({ entity_id: entityId, provider_id: p.id }),
    );

    const result = getBestAffiliateLinks(
      { entityId },
      manyProviders,
      manyLinks,
    );
    expect(result.length).toBe(3);
  });

  it("accounts for manual priority in link", () => {
    const boostedLink = makeLink({
      entity_id: entityId,
      provider_id: "p-beta",
      priority: 50, // Big boost
    });
    const result = getBestAffiliateLinks(
      { entityId },
      allProviders,
      [linkA, boostedLink, linkC],
    );
    // Beta Chem should now rank first due to priority boost
    expect(result[0].provider.id).toBe("p-beta");
  });

  it("ignores links for different entities", () => {
    const otherLink = makeLink({
      entity_id: "ent-other",
      provider_id: "p-alpha",
    });
    const result = getBestAffiliateLinks(
      { entityId },
      allProviders,
      [otherLink],
    );
    expect(result).toEqual([]);
  });

  it("includes price_range in score computation", () => {
    // Budget should score higher than premium for equal quality
    const budgetProvider = makeProvider({
      id: "p-budget",
      name: "Budget Co",
      quality_score: 60,
      price_range: "budget",
    });
    const premiumProvider = makeProvider({
      id: "p-premium",
      name: "Premium Co",
      quality_score: 60,
      price_range: "premium",
    });

    const links = [
      makeLink({ entity_id: entityId, provider_id: "p-budget" }),
      makeLink({ entity_id: entityId, provider_id: "p-premium" }),
    ];

    const result = getBestAffiliateLinks(
      { entityId },
      [budgetProvider, premiumProvider],
      links,
    );

    expect(result[0].provider.id).toBe("p-budget");
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });
});
