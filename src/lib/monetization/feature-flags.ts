/**
 * Monetization Feature Flags
 *
 * Reads environment variables following the existing project pattern
 * (ADMIN_ENABLED / NEXT_PUBLIC_ADMIN_ENABLED).
 *
 * All flags default to disabled ("false") for safe rollout.
 */

import type { AutolinkConfig } from "./types";

/** Server-side: is the monetization system active? */
export function isMonetizationEnabled(): boolean {
  return (
    (process.env.MONETIZATION_ENABLED ??
      process.env.NEXT_PUBLIC_MONETIZATION_ENABLED) === "true"
  );
}

/** Server-side: is the MDX autolink engine active? */
export function isAutolinkEnabled(): boolean {
  return isMonetizationEnabled() && process.env.AUTOLINK_ENABLED === "true";
}

/** Build an AutolinkConfig from environment variables. */
export function getAutolinkConfig(): AutolinkConfig {
  const raw = process.env.AUTOLINK_MIN_EVIDENCE_SCORE;
  const minEvidenceScore = raw ? parseInt(raw, 10) : 40;

  return {
    minEvidenceScore: Number.isFinite(minEvidenceScore) ? minEvidenceScore : 40,
    allowHighRisk: false,
  };
}
