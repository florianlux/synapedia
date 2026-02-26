-- Migration: Import audit log tables + new substance fields
-- Adds audit tracking for import runs, and extends substances with
-- canonical_id, verification_status, sources citation JSONB,
-- aliases JSONB, and last_imported_at.

-- ── New columns on substances ────────────────────────────────────────────

ALTER TABLE public.substances
  ADD COLUMN IF NOT EXISTS canonical_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS sources_meta jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS aliases_list jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_imported_at timestamptz DEFAULT NULL;

-- Index for deduplication by canonical_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_substances_canonical_id
  ON public.substances (canonical_id)
  WHERE canonical_id IS NOT NULL;

-- Index for filtering by verification status
CREATE INDEX IF NOT EXISTS idx_substances_verification_status
  ON public.substances (verification_status);

-- ── Import audit tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  triggered_by text,                       -- admin user or 'system'
  source_config jsonb,                     -- which adapters/filters used
  dry_run boolean NOT NULL DEFAULT false,
  total_items integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running'   -- running | done | failed
);

CREATE TABLE IF NOT EXISTS public.import_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.import_runs(id) ON DELETE CASCADE,
  substance_name text NOT NULL,
  substance_slug text,
  canonical_id text,
  action text,                             -- inserted | updated | skipped | failed
  error_message text,
  confidence_score integer,
  sources jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying items by run
CREATE INDEX IF NOT EXISTS idx_import_run_items_run_id
  ON public.import_run_items (run_id);

-- RLS: admin-only
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_run_items ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (import pipeline runs server-side with service key)
CREATE POLICY "service_role_import_runs" ON public.import_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_import_run_items" ON public.import_run_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
