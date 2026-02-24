-- Migration: Add import engine metadata columns to public schema.
--
-- This migration adds columns to track import pipeline statuses and
-- confidence scores.

-- Add confidence_score and pipeline status tracking to public.substances
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
