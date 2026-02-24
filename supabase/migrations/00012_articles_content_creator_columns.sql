-- ============================================================
-- 00012_articles_content_creator_columns.sql
-- Add columns needed by the Content Creator pipeline:
--   substance_id, substance_slug, excerpt, sources (jsonb),
--   tags (text[]), cover_image_url, generation_meta, ai_model.
-- Also widen the risk_level CHECK to include 'unknown'.
-- ============================================================

SET search_path TO public;

-- 1. Widen risk_level to allow 'unknown'
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_risk_level_check;
ALTER TABLE articles ADD CONSTRAINT articles_risk_level_check
    CHECK (risk_level IN ('low', 'moderate', 'high', 'unknown'));

-- 2. Add Content Creator columns (idempotent with IF NOT EXISTS-style checks)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS substance_id     uuid REFERENCES substances(id) ON DELETE SET NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS substance_slug   text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt          text DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS sources          jsonb DEFAULT '[]'::jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS tags             text[] DEFAULT '{}';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cover_image_url  text DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS generation_meta  jsonb DEFAULT '{}'::jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ai_model         text DEFAULT '';

-- 3. Unique index on substance_slug (partial — only where not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_substance_slug
    ON articles (substance_slug) WHERE substance_slug IS NOT NULL;

-- 4. FK index for substance_id
CREATE INDEX IF NOT EXISTS idx_articles_substance_id
    ON articles (substance_id) WHERE substance_id IS NOT NULL;
