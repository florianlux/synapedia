import { z } from "zod";

/* ---------- Substance Draft Schema (Zod) ---------- */

export const EffectsSchema = z.object({
  positive: z.array(z.string()).default([]),
  neutral: z.array(z.string()).default([]),
  negative: z.array(z.string()).default([]),
});

export const RisksSchema = z.object({
  acute: z.array(z.string()).default([]),
  chronic: z.array(z.string()).default([]),
  contraindications: z.array(z.string()).default([]),
});

export const InteractionsSchema = z.object({
  high_risk_pairs: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
});

export const DependenceSchema = z.object({
  potential: z.enum(["low", "medium", "high", "unknown"]).default("unknown"),
  notes: z.array(z.string()).default([]),
});

export const LegalitySchema = z.object({
  germany: z.enum(["legal", "controlled", "unknown"]).default("unknown"),
  notes: z.array(z.string()).default([]),
});

export const CitationsMap = z.record(z.string(), z.array(z.string()));
export const ConfidenceMap = z.record(z.string(), z.number().min(0).max(1));

export const SubstanceDraftSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  categories: z.array(z.string()).default([]),
  summary: z.string().default(""),
  mechanism: z.string().default(""),
  effects: EffectsSchema.default({ positive: [], neutral: [], negative: [] }),
  risks: RisksSchema.default({ acute: [], chronic: [], contraindications: [] }),
  interactions: InteractionsSchema.default({ high_risk_pairs: [], notes: [] }),
  dependence: DependenceSchema.default({ potential: "unknown", notes: [] }),
  legality: LegalitySchema.default({ germany: "unknown", notes: [] }),
  citations: CitationsMap.default({}),
  confidence: ConfidenceMap.default({}),
});

export type SubstanceDraft = z.infer<typeof SubstanceDraftSchema>;
export type Effects = z.infer<typeof EffectsSchema>;
export type Risks = z.infer<typeof RisksSchema>;
export type Interactions = z.infer<typeof InteractionsSchema>;
export type Dependence = z.infer<typeof DependenceSchema>;
export type Legality = z.infer<typeof LegalitySchema>;

/* ---------- Source Schema ---------- */

export const SubstanceSourceSchema = z.object({
  id: z.string().uuid().optional(),
  substance_id: z.string().uuid(),
  source_name: z.string().default(""),
  source_url: z.string().default(""),
  source_type: z.enum(["psychonautwiki", "drugcom", "pubmed", "reddit", "other"]).default("other"),
  retrieved_at: z.string().optional(),
  snippet: z.string().max(200).default(""),
  snippet_hash: z.string().default(""),
  license_note: z.string().default(""),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type SubstanceSource = z.infer<typeof SubstanceSourceSchema>;

/* ---------- Reddit Report Schema ---------- */

export const RedditReportSchema = z.object({
  id: z.string().uuid().optional(),
  substance_id: z.string().uuid(),
  reddit_post_id: z.string().default(""),
  title: z.string().default(""),
  subreddit: z.string().default(""),
  url: z.string().default(""),
  created_utc: z.string().optional(),
  upvotes: z.number().int().default(0),
  sentiment: z.number().default(0),
  themes: z.array(z.string()).default([]),
  risk_flags: z.array(z.string()).default([]),
});

export type RedditReport = z.infer<typeof RedditReportSchema>;

/* ---------- DB row type (with id, status, created_at) ---------- */

export interface SubstanceRow {
  id: string;
  name: string;
  slug: string;
  categories: string[];
  summary: string;
  mechanism: string;
  effects: Effects;
  risks: Risks;
  interactions: Interactions;
  dependence: Dependence;
  legality: Legality;
  citations: Record<string, string[]>;
  confidence: Record<string, number>;
  status: "draft" | "review" | "published";
  created_at: string;
}

/* ---------- Bulk import request schema ---------- */

export const BulkImportRequestSchema = z.object({
  names: z.array(z.string().min(1)).min(1).max(500),
  options: z.object({
    fetchSources: z.boolean().default(true),
    generateDraft: z.boolean().default(true),
    queueRedditScan: z.boolean().default(true),
  }).default({ fetchSources: true, generateDraft: true, queueRedditScan: true }),
});

export type BulkImportRequest = z.infer<typeof BulkImportRequestSchema>;
