-- Migration: Add aliases, risk_level, and evidence_level columns to substances
-- Supports the substances-first import pipeline (import-substances-masterlist.ts).

-- 1) aliases text[] for inline alias storage
ALTER TABLE public.substances
  ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';

-- 2) risk_level and evidence_level for masterlist import
ALTER TABLE public.substances
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'Unbekannt',
  ADD COLUMN IF NOT EXISTS evidence_level text NOT NULL DEFAULT 'Unbekannt';

-- 3) GIN index on aliases for fast containment queries
CREATE INDEX IF NOT EXISTS idx_substances_aliases_gin
  ON public.substances USING gin (aliases);
