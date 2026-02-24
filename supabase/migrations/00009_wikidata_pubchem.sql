-- Migration: Add Wikidata QID and PubChem CID columns for external linking.
-- Also adds indexes for fast lookup by these external identifiers and
-- expands import_logs to support the 'wikidata' source type.

-- 1) Add wikidata_qid and pubchem_cid to substances
ALTER TABLE public.substances
  ADD COLUMN IF NOT EXISTS wikidata_qid text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pubchem_cid  bigint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();

-- 2) Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_substances_wikidata_qid ON public.substances (wikidata_qid) WHERE wikidata_qid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_substances_pubchem_cid  ON public.substances (pubchem_cid)  WHERE pubchem_cid IS NOT NULL;

-- 3) Unique constraint on alias text (across all substances) for dedup lookup
CREATE INDEX IF NOT EXISTS idx_substance_aliases_alias_lower ON public.substance_aliases (lower(alias));

-- 4) Allow 'wikidata' as import source type
ALTER TABLE public.import_logs
  DROP CONSTRAINT IF EXISTS import_logs_source_type_check;
ALTER TABLE public.import_logs
  ADD CONSTRAINT import_logs_source_type_check
  CHECK (source_type IN ('seed_pack','paste','csv','fetch','wikidata','pubchem'));
