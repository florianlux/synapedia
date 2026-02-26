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
  content_html?: string | null;
  status: ArticleStatus;
  risk_level: RiskLevel;
  evidence_strength: EvidenceStrength;
  category: string | null;
  receptor: string | null;
  legal_status: string | null;
  substance_id?: string | null;
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

// Content Studio types

export interface Template {
  id: string;
  name: string;
  slug: string;
  schema_json: TemplateSchema;
  created_at: string;
  updated_at: string;
}

export interface TemplateSchema {
  sections: TemplateSection[];
  links?: TemplateLink[];
  rules?: TemplateRule[];
}

export interface TemplateSection {
  key: string;
  title: string;
  required: boolean;
  blockDefaults?: string;
  aiHints?: string;
  mediaSlots?: string[];
}

export interface TemplateLink {
  from: string;
  to: string;
  relation: string;
  rule?: string;
}

export interface TemplateRule {
  condition: string;
  action: string;
}

export interface Media {
  id: string;
  bucket: string;
  path: string;
  url: string | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  tags: string[];
  created_at: string;
}

export interface ArticleMedia {
  article_id: string;
  media_id: string;
  role: string;
  section_key: string | null;
  sort: number;
  created_at: string;
}

export type AiJobStatus = "queued" | "running" | "done" | "failed";

export interface AiJob {
  id: string;
  type: string;
  status: AiJobStatus;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface GraphEdge {
  id: string;
  article_id: string;
  from_type: string;
  from_key: string;
  to_type: string;
  to_key: string;
  relation: string;
  confidence: number;
  origin: string;
  created_at: string;
}

// Article Templates (AI article generation)

export interface ArticleTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  prompt_system: string;
  prompt_user: string;
  output_schema: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type GeneratedArticleStatus = "draft" | "blocked" | "review" | "mapped";

export interface GeneratedArticle {
  id: string;
  substance_id: string | null;
  template_key: string;
  content_mdx: string;
  citations: GeneratedCitation[];
  model_info: Record<string, unknown>;
  status: GeneratedArticleStatus;
  blocked_reasons: string[];
  article_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedCitation {
  url: string;
  title: string;
  fetched_at?: string;
  license?: string;
}

// SEO types

export type SeoEntityType = "article" | "substance" | "glossary" | "page";

export interface SeoDocument {
  id: string;
  slug: string;
  entity_type: SeoEntityType;
  title: string | null;
  description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  robots: string;
  keywords: string[] | null;
  structured_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// User logs (account protocol)

export type LogEntryType = "medication" | "use";

export interface UserLog {
  id: string;
  user_id: string;
  entry_type: LogEntryType;
  occurred_at: string;
  substance_name: string | null;
  dose_value: number | null;
  dose_unit: string | null;
  route: string | null;
  notes: string | null;
  safer_use_notes: string | null;
  created_at: string;
}

// User profile

export interface UserProfile {
  id: string;
  username: string;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  newsletter_opt_in: boolean;
  favorite_tags: string[];
  created_at: string;
  updated_at: string;
}

// Community feed

export interface FeedPost {
  id: string;
  author_id: string;
  title: string | null;
  body: string;
  tags: string[];
  substance_id: string | null;
  visibility: "public" | "unlisted";
  status: "published" | "flagged" | "deleted";
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  author_username?: string | null;
  author_avatar_url?: string | null;
  vote_count?: number;
  user_voted?: boolean;
}

// Pharmacology types

export interface Target {
  id: string;
  slug: string;
  name: string;
  family: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type MeasureType = "Ki" | "IC50" | "EC50" | "qualitative";
export type EffectType = "agonist" | "antagonist" | "partial_agonist" | "inhibitor" | "releaser" | "modulator" | "unknown";
export type ConfidenceLevel = "literature" | "clinical" | "estimate" | "low";
export type PKRoute = "oral" | "nasal" | "iv" | "smoked" | "sublingual";

export interface PharmacologySource {
  title: string;
  year?: number | null;
  authors?: string | null;
  url?: string | null;
  doi?: string | null;
}

export interface SubstanceTargetAffinity {
  id: string;
  substance_id: string;
  target_id: string;
  measure_type: MeasureType;
  affinity_nm: number | null;
  effect_type: EffectType | null;
  efficacy: number | null;
  confidence_level: ConfidenceLevel;
  sources: PharmacologySource[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AffinityWithTarget extends SubstanceTargetAffinity {
  target: Target;
  strength: number;
}

export interface PharmacokineticRoute {
  id: string;
  substance_id: string;
  route: PKRoute;
  onset_min: number | null;
  onset_max: number | null;
  tmax_min: number | null;
  tmax_max: number | null;
  duration_min: number | null;
  duration_max: number | null;
  half_life_h: number | null;
  bioavailability_f: number | null;
  ka_h: number | null;
  ke_h: number | null;
  cmax_rel: number | null;
  after_effects_min: number | null;
  after_effects_max: number | null;
  confidence_level: ConfidenceLevel;
  sources: PharmacologySource[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Pharmacodynamics {
  id: string;
  substance_id: string;
  route: string | null;
  emax: number;
  ec50_mg: number | null;
  ec50_rel_concentration: number | null;
  hill_h: number;
  baseline_e0: number;
  therapeutic_index: number | null;
  tolerance_shift_per_day: number | null;
  confidence_level: ConfidenceLevel;
  sources: PharmacologySource[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SubstancePharmacology {
  targets: AffinityWithTarget[];
  pkRoutes: PharmacokineticRoute[];
  pdParams: Pharmacodynamics[];
}

export interface PKCurvePoint {
  t: number;
  mean: number;
  low: number;
  high: number;
}

// Safer-Use Chat types

export type SaferUseRiskLevel = "GRÜN" | "GELB" | "ORANGE" | "ROT";

export interface SaferUseIntakeEntry {
  substance: string;
  dose_mg: number | null;
  route: string;
  time_taken: string;
  notes: string;
}

export interface SaferUseUserProfile {
  age_range: string;
  weight_kg: number | null;
  tolerance: string;
  conditions: string[];
  regular_meds: string[];
}

export interface SaferUseChatRequest {
  user_profile: SaferUseUserProfile;
  intake_log: SaferUseIntakeEntry[];
  user_message: string;
  locale: string;
}

export interface SaferUseChatResponse {
  assessment: string;
  risk_level: SaferUseRiskLevel;
  interactions: string[];
  harm_reduction: string[];
  emergency: string | null;
  disclaimer: string;
}

// Chat session persistence types

export interface ChatSession {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  visitor_id: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  title: string | null;
  risk_level: string | null;
  message_count: number;
  consent_at: string | null;
  retain_until: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  created_at: string;
  role: "user" | "assistant";
  content: Record<string, unknown>;
  risk_level: string | null;
}
