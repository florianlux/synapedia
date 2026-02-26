/**
 * PsychonautWiki Source Adapter — DISABLED.
 *
 * PsychonautWiki does not currently offer a public REST API with a
 * clear ToS permitting automated bulk retrieval.  This adapter is
 * intentionally disabled (enabled: false) and left as a placeholder
 * for future implementation once API access / ToS is confirmed.
 */
import type { SourceAdapter } from "./index";

export const psychonautwikiAdapter: SourceAdapter = {
  id: "psychonautwiki",
  label: "PsychonautWiki (deaktiviert)",
  enabled: false,
  supportsSearch: false,
  supportsBulk: false,

  async search(): Promise<never[]> {
    throw new Error("PsychonautWiki adapter is disabled.");
  },
  async fetchById(): Promise<null> {
    return null;
  },
  async fetchBulk(): Promise<never[]> {
    return [];
  },
};
