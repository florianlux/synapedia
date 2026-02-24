-- Migration: Add import engine metadata columns to synapedia schema.
--
-- This migration adds columns to track import pipeline statuses and
-- confidence scores. If the synapedia schema does not exist, it falls
-- back to public schema tables (for demo/dev environments).
--
-- If running against the synapedia schema:
--   ALTER TABLE synapedia.substances ...
--
-- For environments without the synapedia schema, these columns are
-- stored in the existing `meta` jsonb column via the import engine.

-- Add confidence_score and pipeline status tracking to public.substances
-- (mirrors what would be in synapedia.substances if that schema exists)
ALTER TABLE public.substances
  ADD COLUMN IF NOT EXISTS confidence_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wikidata_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pubchem_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS import_run_id text DEFAULT NULL;

-- Index for filtering substances needing review
CREATE INDEX IF NOT EXISTS idx_substances_confidence
  ON public.substances (confidence_score)
  WHERE confidence_score < 70;

CREATE INDEX IF NOT EXISTS idx_substances_ai_status
  ON public.substances (ai_status)
  WHERE ai_status IS NOT NULL;
