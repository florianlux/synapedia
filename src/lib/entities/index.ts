/**
 * Entity Management System
 * Exports all entity-related functions and utilities
 */

// Evidence score calculation
export {
  calculateSingleEvidenceScore,
  calculateAggregateEvidenceScore,
  evidenceScoreToGrade,
  evidenceGradeColor,
  meetsEvidenceThreshold,
} from "./evidence-score";

// Smart linking engine
export {
  DEFAULT_SMART_LINKING_CONFIG,
  getEntityThreshold,
  shouldLinkEntity,
  findEntityMentions,
  injectSmartLinks,
  generateSmartLinkTooltip,
} from "./smart-linking";
export type { EntityMention } from "./smart-linking";

// Stack builder
export {
  buildStack,
  getRecommendedDoseRange,
  validateStack,
} from "./stack-builder";

// Affiliate routing
export {
  REGIONAL_PRIORITY_DEFAULT,
  getRegionalPriority,
  detectUserRegion,
  selectProviderForRegion,
  getAffiliateLinkForEntity,
  sortAffiliateLinks,
  generateTrackingUrl,
  formatProviderBadges,
} from "./affiliate-routing";

// Database queries
export {
  getEntities,
  getEntityBySlug,
  upsertEntity,
  recalculateEntityEvidenceScore,
  addEvidenceSource,
  getAffiliateProviders,
  getEntityAffiliateLinks,
  getStacks,
  getStackBySlug,
  getAdminConfig,
  setAdminConfig,
  trackAffiliateEvent,
} from "./db";
