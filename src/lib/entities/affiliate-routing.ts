/**
 * Affiliate Routing Logic
 * Region-based provider selection and link routing
 */

import type {
  Entity,
  AffiliateProvider,
  AffiliateLinkWithProvider,
} from "@/lib/types";

// Regional priority configuration
export const REGIONAL_PRIORITY_DEFAULT = ["EU", "US", "UK", "CA", "AU"];

/**
 * Get regional priority from admin config or use default
 */
export function getRegionalPriority(
  adminConfig?: string[]
): string[] {
  return adminConfig && adminConfig.length > 0
    ? adminConfig
    : REGIONAL_PRIORITY_DEFAULT;
}

/**
 * Detect user region from various signals
 * In production, this would use IP geolocation or explicit user selection
 */
export function detectUserRegion(
  request?: Request,
  userPreference?: string
): string {
  // Priority: user preference > request headers > default
  if (userPreference) return userPreference;

  // Check headers for region hints (Cloudflare, Vercel, etc.)
  if (request) {
    const cfCountry = request.headers.get("CF-IPCountry");
    const vercelRegion = request.headers.get("x-vercel-ip-country");

    if (cfCountry) {
      return mapCountryToRegion(cfCountry);
    }
    if (vercelRegion) {
      return mapCountryToRegion(vercelRegion);
    }
  }

  // Default to EU
  return "EU";
}

/**
 * Map country code to region
 */
function mapCountryToRegion(countryCode: string): string {
  const euCountries = [
    "DE",
    "FR",
    "IT",
    "ES",
    "NL",
    "BE",
    "AT",
    "SE",
    "DK",
    "FI",
    "NO",
    "IE",
    "PT",
    "GR",
    "PL",
    "CZ",
    "HU",
    "RO",
  ];

  if (euCountries.includes(countryCode)) return "EU";
  if (countryCode === "US") return "US";
  if (countryCode === "GB" || countryCode === "UK") return "UK";
  if (countryCode === "CA") return "CA";
  if (countryCode === "AU" || countryCode === "NZ") return "AU";

  return "INTL";
}

/**
 * Select best affiliate provider for user's region
 */
export function selectProviderForRegion(
  providers: AffiliateProvider[],
  userRegion: string,
  regionalPriority: string[]
): AffiliateProvider | null {
  if (providers.length === 0) return null;

  // Filter verified providers only
  const verifiedProviders = providers.filter((p) => p.verified);

  if (verifiedProviders.length === 0) return null;

  // Try to match exact region
  const exactMatch = verifiedProviders.find((p) => p.region === userRegion);
  if (exactMatch) return exactMatch;

  // Try regions in priority order
  for (const region of regionalPriority) {
    const match = verifiedProviders.find((p) => p.region === region);
    if (match) return match;
  }

  // Fall back to first verified provider
  return verifiedProviders[0];
}

/**
 * Get affiliate link for entity based on region
 */
export function getAffiliateLinkForEntity(
  entity: Entity,
  affiliateLinks: AffiliateLinkWithProvider[],
  userRegion: string,
  regionalPriority: string[]
): AffiliateLinkWithProvider | null {
  // Filter active links for this entity
  const entityLinks = affiliateLinks.filter(
    (link) => link.entity_id === entity.id && link.active
  );

  if (entityLinks.length === 0) return null;

  // Get providers
  const providers = entityLinks
    .map((link) => link.provider)
    .filter((p): p is AffiliateProvider => p !== undefined);

  // Select best provider for region
  const selectedProvider = selectProviderForRegion(
    providers,
    userRegion,
    regionalPriority
  );

  if (!selectedProvider) return null;

  // Return the link for this provider
  return (
    entityLinks.find((link) => link.provider_id === selectedProvider.id) || null
  );
}

/**
 * Sort affiliate links by quality and region relevance
 */
export function sortAffiliateLinks(
  links: AffiliateLinkWithProvider[],
  userRegion: string
): AffiliateLinkWithProvider[] {
  return links.sort((a, b) => {
    // Verified providers first
    const aVerified = a.provider?.verified ? 1 : 0;
    const bVerified = b.provider?.verified ? 1 : 0;
    if (aVerified !== bVerified) return bVerified - aVerified;

    // Lab tested second
    const aLabTested = a.provider?.lab_tested ? 1 : 0;
    const bLabTested = b.provider?.lab_tested ? 1 : 0;
    if (aLabTested !== bLabTested) return bLabTested - aLabTested;

    // Region match
    const aRegionMatch = a.provider?.region === userRegion ? 1 : 0;
    const bRegionMatch = b.provider?.region === userRegion ? 1 : 0;
    if (aRegionMatch !== bRegionMatch) return bRegionMatch - aRegionMatch;

    // Quality score
    const aQuality = a.quality_score || 0;
    const bQuality = b.quality_score || 0;
    return bQuality - aQuality;
  });
}

/**
 * Generate affiliate tracking URL with parameters
 */
export function generateTrackingUrl(
  affiliateUrl: string,
  entityId: string,
  userId?: string,
  sessionId?: string
): string {
  const url = new URL(affiliateUrl);

  // Add tracking parameters
  url.searchParams.set("ref", "neurocodex");
  url.searchParams.set("entity", entityId);

  if (userId) {
    url.searchParams.set("uid", userId);
  }

  if (sessionId) {
    url.searchParams.set("sid", sessionId);
  }

  return url.toString();
}

/**
 * Format provider quality badge
 */
export function formatProviderBadges(provider: AffiliateProvider): string[] {
  const badges: string[] = [];

  if (provider.verified) {
    badges.push("✓ Verified");
  }

  if (provider.lab_tested) {
    badges.push("🔬 Lab Tested");
  }

  if (provider.quality_rating && provider.quality_rating >= 4.5) {
    badges.push("⭐ Premium Quality");
  }

  return badges;
}
