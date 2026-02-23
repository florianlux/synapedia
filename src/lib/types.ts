export type RiskLevel = "low" | "moderate" | "high" | "unknown";
export type EvidenceStrength = "weak" | "moderate" | "strong";
export type ArticleStatus = "draft" | "review" | "published";

export const riskLabels: Record<RiskLevel, string> = {
  low: "Niedriges Risiko",
  moderate: "Moderates Risiko",
  high: "Hohes Risiko",
  unknown: "Unbekanntes Risiko",
};

export const evidenceLabels: Record<EvidenceStrength, string> = {
  weak: "Schwache Evidenz",
  moderate: "Moderate Evidenz",
  strong: "Starke Evidenz",
};

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string;
  content_mdx: string;
  status: ArticleStatus;
  risk_level: RiskLevel;
  evidence_strength: EvidenceStrength;
  category: string | null;
  receptor: string | null;
  legal_status: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Source {
  id: string;
  title: string;
  authors: string | null;
  journal: string | null;
  year: number | null;
  doi: string | null;
  url: string | null;
  source_type: string;
}

export interface ArticleTag {
  article_id: string;
  tag_id: string;
}

export interface ArticleSource {
  article_id: string;
  source_id: string;
  citation_order: number;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
  content_mdx: string;
  title: string;
  changed_by: string | null;
  change_summary: string | null;
  created_at: string;
}
