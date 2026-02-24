-- Migration: Add meta column and canonical_name unique index for bulk import
-- The meta column stores extra payload keys that don't map to known columns.

-- 1) Add meta jsonb column to substances
ALTER TABLE public.substances
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}';

-- 2) Add unique index on canonical_name for upsert conflict resolution.
--    Only index non-empty values to allow multiple empty strings.
CREATE UNIQUE INDEX IF NOT EXISTS idx_substances_canonical_name_unique
  ON public.substances (canonical_name)
  WHERE canonical_name IS NOT NULL AND canonical_name != '';
