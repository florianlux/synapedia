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

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
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

// ---------------------------------------------------------------------------
// Substance types
// ---------------------------------------------------------------------------

export type SubstanceStatus = "draft" | "review" | "published" | "archived";

export interface Substance {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  class_primary: string | null;
  class_secondary: string | null;
  status: SubstanceStatus;
  risk_level: RiskLevel;
  summary: string | null;
  source_license: string | null;
  source_license_url: string | null;
  imported_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubstanceSource {
  id: string;
  substance_id: string;
  source_url: string;
  source_domain: string;
  source_title: string | null;
  fetched_at: string | null;
  raw_excerpt: string | null;
  parsed_json: Record<string, unknown> | null;
  confidence: number;
  created_at: string;
}

export type JobType = "import_psychonautwiki" | "generate_article" | "refresh";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface SubstanceJob {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  substance_id: string | null;
  attempts: number;
  max_attempts: number;
  priority: number;
  error: string | null;
  result_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface DomainAllowlistEntry {
  id: string;
  domain: string;
  enabled: boolean;
  rate_limit_ms: number;
  created_at: string;
}

export type GeneratedArticleStatus = "draft" | "review" | "published";

export interface GeneratedArticle {
  id: string;
  substance_id: string;
  article_id: string | null;
  status: GeneratedArticleStatus;
  content_mdx: string;
  citations: { url: string; title?: string; imported_at?: string }[];
  model_info: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
