/**
 * Smart Monetization Layer – Module Exports
 */

// Types
export type {
  Entity,
  AffiliateProvider,
  EntityProviderLink,
  AffiliateLinkQuery,
  RankedAffiliateLink,
  EntityDictionaryEntry,
  AutolinkConfig,
  PriceRange,
} from "./types";
export { DEFAULT_AUTOLINK_CONFIG } from "./types";

// Entity dictionary
export {
  buildEntityDictionary,
  getEntityDictionary,
  clearEntityDictionaryCache,
} from "./entity-dictionary";

// Autolink engine
export { autolinkEntities } from "./autolink-engine";
export type { AutolinkResult } from "./autolink-engine";

// Affiliate routing
export { getBestAffiliateLinks } from "./affiliate-routing";

// Feature flags
export {
  isMonetizationEnabled,
  isAutolinkEnabled,
  getAutolinkConfig,
} from "./feature-flags";
