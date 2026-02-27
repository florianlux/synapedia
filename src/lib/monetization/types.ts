/**
 * Phase 2: Smart Monetization Layer – Type Definitions
 *
 * Types for entity linking, affiliate providers, and the "Verified Sources" UI module.
 */

// ---------------------------------------------------------------------------
// Entity (linkable substance/compound)
// ---------------------------------------------------------------------------

export interface Entity {
  id: string;
  name: string;
  slug: string;
  synonyms: string[];
  entity_type: "substance" | "supplement" | "tool";
  evidence_score: number;
  risk_level: "low" | "moderate" | "high" | "unknown";
  monetization_enabled: boolean;
  autolink_whitelisted: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Affiliate Provider
// ---------------------------------------------------------------------------

export type PriceRange = "budget" | "mid" | "premium";

export interface AffiliateProvider {
  id: string;
  name: string;
  slug: string;
  website_url: string;
  logo_url: string | null;
  description: string | null;
  verified: boolean;
  active: boolean;
  quality_score: number;
  region: string;
  price_range: PriceRange | null;
  affiliate_tag: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Entity ↔ Provider Link
// ---------------------------------------------------------------------------

export interface EntityProviderLink {
  id: string;
  entity_id: string;
  provider_id: string;
  affiliate_url: string;
  custom_label: string | null;
  priority: number;
  active: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Affiliate Routing – query params & ranked result
// ---------------------------------------------------------------------------

export interface AffiliateLinkQuery {
  entityId: string;
  region?: string;
  limit?: number;
  minQuality?: number;
  requireVerified?: boolean;
}

export interface RankedAffiliateLink {
  provider: AffiliateProvider;
  affiliate_url: string;
  custom_label: string | null;
  score: number; // computed ranking score
}

// ---------------------------------------------------------------------------
// Entity Dictionary – used by the contextual linking engine
// ---------------------------------------------------------------------------

export interface EntityDictionaryEntry {
  entity_id: string;
  name: string;
  slug: string;
  evidence_score: number;
  risk_level: string;
  monetization_enabled: boolean;
  autolink_whitelisted: boolean;
}

// ---------------------------------------------------------------------------
// Autolink configuration
// ---------------------------------------------------------------------------

export interface AutolinkConfig {
  /** Minimum evidence score to auto-link (0–100) */
  minEvidenceScore: number;
  /** Allow linking high-risk entities only if whitelisted */
  allowHighRisk: boolean;
}

export const DEFAULT_AUTOLINK_CONFIG: AutolinkConfig = {
  minEvidenceScore: 40,
  allowHighRisk: false,
};
