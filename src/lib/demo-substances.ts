/**
 * Demo substance data for when Supabase is not connected.
 */

import type { Substance, SubstanceJob, DomainAllowlistEntry } from "@/lib/types";

export const demoSubstances: Substance[] = [
  {
    id: "demo-1",
    slug: "psilocybin",
    name: "Psilocybin",
    aliases: ["Magic Mushrooms", "Psilocin", "4-AcO-DMT (Prodrug)"],
    class_primary: "Tryptamines",
    class_secondary: "Psychedelics",
    status: "published",
    risk_level: "moderate",
    summary:
      "Psilocybin ist ein natürlich vorkommendes Tryptamin-Alkaloid mit 5-HT2A-Agonismus. Aktuelle klinische Studien zeigen vielversprechende Ergebnisse.",
    source_license: "CC BY-SA 4.0",
    source_license_url: "https://psychonautwiki.org/wiki/Copyrights",
    imported_at: "2025-01-15T12:00:00Z",
    created_at: "2025-01-15T12:00:00Z",
    updated_at: "2025-06-01T12:00:00Z",
  },
  {
    id: "demo-2",
    slug: "mdma",
    name: "MDMA",
    aliases: ["Ecstasy", "Molly", "3,4-MDMA"],
    class_primary: "Substituted amphetamines",
    class_secondary: "Entactogens",
    status: "review",
    risk_level: "high",
    summary:
      "MDMA ist ein synthetisches Empathogen-Entaktogen. Phase-III-Studien zur MDMA-unterstützten Psychotherapie bei PTBS zeigen signifikante Ergebnisse.",
    source_license: "CC BY-SA 4.0",
    source_license_url: "https://psychonautwiki.org/wiki/Copyrights",
    imported_at: "2025-01-15T12:00:00Z",
    created_at: "2025-02-01T12:00:00Z",
    updated_at: "2025-06-15T12:00:00Z",
  },
  {
    id: "demo-3",
    slug: "ketamin",
    name: "Ketamin",
    aliases: ["Ketamine", "Special K"],
    class_primary: "Arylcyclohexylamines",
    class_secondary: "Dissociatives",
    status: "draft",
    risk_level: "moderate",
    summary:
      "Ketamin ist ein dissoziatives Anästhetikum und NMDA-Rezeptor-Antagonist mit rapid-antidepressiver Wirkung.",
    source_license: "CC BY-SA 4.0",
    source_license_url: "https://psychonautwiki.org/wiki/Copyrights",
    imported_at: "2025-01-15T12:00:00Z",
    created_at: "2025-03-01T12:00:00Z",
    updated_at: "2025-07-01T12:00:00Z",
  },
];

export const demoJobs: SubstanceJob[] = [
  {
    id: "job-1",
    type: "import_psychonautwiki",
    status: "succeeded",
    payload: {},
    substance_id: null,
    attempts: 1,
    max_attempts: 3,
    priority: 5,
    error: null,
    result_json: { imported_count: 3, updated_count: 0 },
    created_at: "2025-01-15T11:55:00Z",
    updated_at: "2025-01-15T12:00:00Z",
    started_at: "2025-01-15T11:55:00Z",
    finished_at: "2025-01-15T12:00:00Z",
  },
];

export const demoAllowlist: DomainAllowlistEntry[] = [
  {
    id: "allow-1",
    domain: "psychonautwiki.org",
    enabled: true,
    rate_limit_ms: 2000,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "allow-2",
    domain: "wikipedia.org",
    enabled: false,
    rate_limit_ms: 1500,
    created_at: "2025-01-01T00:00:00Z",
  },
];
