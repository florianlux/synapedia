-- Migration: Enrichment System tables
-- Adds substance_aliases, enrichment_jobs, import_logs, and new columns on substances

-- 1) Add external_id and extra metadata columns to substances
ALTER TABLE public.substances
  ADD COLUMN IF NOT EXISTS external_ids  jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS canonical_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags          text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_slugs text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS enrichment    jsonb DEFAULT '{}';

-- 2) substance_aliases (synonym/alias table for dedup)
CREATE TABLE IF NOT EXISTS public.substance_aliases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_id  uuid NOT NULL REFERENCES public.substances(id) ON DELETE CASCADE,
  alias         text NOT NULL,
  alias_type    text NOT NULL DEFAULT 'synonym' CHECK (alias_type IN ('synonym','iupac','trade_name','abbreviation','other')),
  source        text DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alias, substance_id)
);

CREATE INDEX IF NOT EXISTS idx_substance_aliases_alias ON public.substance_aliases (alias);
CREATE INDEX IF NOT EXISTS idx_substance_aliases_substance ON public.substance_aliases (substance_id);

-- 3) enrichment_jobs (queue table for background enrichment)
CREATE TABLE IF NOT EXISTS public.enrichment_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_id  uuid NOT NULL REFERENCES public.substances(id) ON DELETE CASCADE,
  phase         text NOT NULL DEFAULT 'pending' CHECK (phase IN ('pending','facts','targets','summary','crosslink','done','error')),
  status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error')),
  error_message text DEFAULT '',
  attempts      int DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON public.enrichment_jobs (status);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_substance ON public.enrichment_jobs (substance_id);

-- 4) import_logs (audit trail for imports)
CREATE TABLE IF NOT EXISTS public.import_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user    text DEFAULT 'unknown',
  source_type   text NOT NULL DEFAULT 'paste' CHECK (source_type IN ('seed_pack','paste','csv','fetch')),
  source_detail text DEFAULT '',
  total_count   int DEFAULT 0,
  created_count int DEFAULT 0,
  skipped_count int DEFAULT 0,
  error_count   int DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.substance_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY substance_aliases_select ON public.substance_aliases FOR SELECT USING (true);
CREATE POLICY substance_aliases_all ON public.substance_aliases FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY enrichment_jobs_select ON public.enrichment_jobs FOR SELECT USING (true);
CREATE POLICY enrichment_jobs_all ON public.enrichment_jobs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY import_logs_select ON public.import_logs FOR SELECT USING (true);
CREATE POLICY import_logs_all ON public.import_logs FOR ALL USING (true) WITH CHECK (true);
