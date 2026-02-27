/**
 * Affiliate Routing Algorithm
 *
 * Server-only function that returns ranked affiliate provider links for a
 * given entity, applying quality, region, verification, and price filters.
 *
 * Ranking criteria (weighted score):
 * 1. active = true (hard filter)
 * 2. provider.verified (optional requirement)
 * 3. region match > global (bonus)
 * 4. higher quality_score
 * 5. lower price_range bucket (optional tiebreaker)
 * 6. manual priority from entity_provider_links
 *
 * Fallback: returns empty array if no providers match → UI hides module.
 */

import type {
  AffiliateProvider,
  EntityProviderLink,
  AffiliateLinkQuery,
  RankedAffiliateLink,
} from "./types";

// ---------------------------------------------------------------------------
// Price range scoring (lower = better for consumers)
// ---------------------------------------------------------------------------

const PRICE_RANGE_SCORES: Record<string, number> = {
  budget: 10,
  mid: 5,
  premium: 0,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the best affiliate links for an entity, ranked by composite score.
 *
 * This is a pure function that works on pre-fetched data (no DB calls).
 * The caller is responsible for fetching providers + links from the DB or cache.
 *
 * @param query     - Filter/sort parameters
 * @param providers - All available providers (pre-filtered to active)
 * @param links     - All entity↔provider links for this entity
 * @returns Ranked list of affiliate links (empty if none match)
 */
export function getBestAffiliateLinks(
  query: AffiliateLinkQuery,
  providers: AffiliateProvider[],
  links: EntityProviderLink[],
): RankedAffiliateLink[] {
  const {
    entityId,
    region,
    limit = 3,
    minQuality = 0,
    requireVerified = false,
  } = query;

  // Build a provider lookup map
  const providerMap = new Map<string, AffiliateProvider>();
  for (const p of providers) {
    if (p.active) providerMap.set(p.id, p);
  }

  // Filter and score each link
  const scored: RankedAffiliateLink[] = [];

  for (const link of links) {
    if (!link.active) continue;
    if (link.entity_id !== entityId) continue;

    const provider = providerMap.get(link.provider_id);
    if (!provider) continue;

    // Hard filters
    if (requireVerified && !provider.verified) continue;
    if (provider.quality_score < minQuality) continue;

    // Compute composite score
    const score = computeScore(provider, link, region);

    scored.push({
      provider,
      affiliate_url: link.affiliate_url,
      custom_label: link.custom_label,
      score,
    });
  }

  // Sort by score descending, then by provider name for stability
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.provider.name.localeCompare(b.provider.name);
  });

  // Apply limit
  return scored.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Score computation
// ---------------------------------------------------------------------------

function computeScore(
  provider: AffiliateProvider,
  link: EntityProviderLink,
  region?: string,
): number {
  let score = 0;

  // Quality score: 0–100 → contributes directly
  score += provider.quality_score;

  // Verified bonus: +20
  if (provider.verified) score += 20;

  // Region match bonus: exact match +15, global fallback +0
  if (region && provider.region !== "global") {
    if (provider.region.toLowerCase() === region.toLowerCase()) {
      score += 15;
    } else {
      // Region mismatch penalty
      score -= 10;
    }
  }

  // Price range bonus (lower = better)
  if (provider.price_range) {
    score += PRICE_RANGE_SCORES[provider.price_range] ?? 0;
  }

  // Manual priority from link: can boost or demote
  score += link.priority;

  return score;
}
