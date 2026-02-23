-- ============================================================
-- 00003_substances.sql
-- Substance management tables for Synapedia
-- ============================================================

-- Ensure the synapedia schema exists (tables use search_path or explicit schema)
CREATE SCHEMA IF NOT EXISTS synapedia;

-- ============================================================
-- 1. Tables
-- ============================================================

-- A) Substances
CREATE TABLE synapedia.substances (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug              text        UNIQUE NOT NULL,
    name              text        NOT NULL,
    aliases           text[]      DEFAULT '{}',
    class_primary     text,
    class_secondary   text,
    status            text        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft', 'review', 'published', 'archived')),
    risk_level        text        DEFAULT 'unknown'
                                  CHECK (risk_level IN ('low', 'moderate', 'high', 'unknown')),
    summary           text,
    source_license    text,
    source_license_url text,
    imported_at       timestamptz,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

-- B) Substance Sources
CREATE TABLE synapedia.substance_sources (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    substance_id      uuid        REFERENCES synapedia.substances(id) ON DELETE CASCADE,
    source_url        text        NOT NULL,
    source_domain     text        NOT NULL,
    source_title      text,
    fetched_at        timestamptz,
    raw_excerpt       text,
    parsed_json       jsonb,
    confidence        numeric     DEFAULT 0.5,
    created_at        timestamptz DEFAULT now()
);

-- C) Substance Jobs
CREATE TABLE synapedia.substance_jobs (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    type              text        NOT NULL
                                  CHECK (type IN ('import_psychonautwiki', 'generate_article', 'refresh')),
    status            text        NOT NULL DEFAULT 'queued'
                                  CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
    payload           jsonb       DEFAULT '{}'::jsonb,
    substance_id      uuid        REFERENCES synapedia.substances(id) ON DELETE SET NULL,
    attempts          int         DEFAULT 0,
    max_attempts      int         DEFAULT 3,
    priority          int         DEFAULT 5,
    error             text,
    result_json       jsonb,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now(),
    started_at        timestamptz,
    finished_at       timestamptz
);

-- D) Domain Allowlist
CREATE TABLE synapedia.domain_allowlist (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    domain            text        UNIQUE NOT NULL,
    enabled           boolean     DEFAULT true,
    rate_limit_ms     int         DEFAULT 1500,
    created_at        timestamptz DEFAULT now()
);

-- E) Generated Articles
CREATE TABLE synapedia.generated_articles (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    substance_id      uuid        REFERENCES synapedia.substances(id) ON DELETE CASCADE,
    article_id        uuid        REFERENCES synapedia.articles(id) ON DELETE SET NULL,
    status            text        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft', 'review', 'published')),
    content_mdx       text        NOT NULL,
    citations         jsonb       DEFAULT '[]'::jsonb,
    model_info        jsonb       DEFAULT '{}'::jsonb,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

-- ============================================================
-- 2. Indexes
-- ============================================================

CREATE INDEX idx_substances_slug   ON synapedia.substances (slug);
CREATE INDEX idx_substances_status ON synapedia.substances (status);
CREATE INDEX idx_substance_jobs_status_type ON synapedia.substance_jobs (status, type);
CREATE INDEX idx_substance_sources_substance_id ON synapedia.substance_sources (substance_id);

-- ============================================================
-- 3. Triggers (reuse update_updated_at_column from 00001)
-- ============================================================

-- Create function in synapedia schema if not available there
CREATE OR REPLACE FUNCTION synapedia.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_substances_updated_at
    BEFORE UPDATE ON synapedia.substances
    FOR EACH ROW
    EXECUTE FUNCTION synapedia.update_updated_at_column();

CREATE TRIGGER trg_generated_articles_updated_at
    BEFORE UPDATE ON synapedia.generated_articles
    FOR EACH ROW
    EXECUTE FUNCTION synapedia.update_updated_at_column();

CREATE TRIGGER trg_substance_jobs_updated_at
    BEFORE UPDATE ON synapedia.substance_jobs
    FOR EACH ROW
    EXECUTE FUNCTION synapedia.update_updated_at_column();

-- ============================================================
-- 4. Row Level Security
-- ============================================================

ALTER TABLE synapedia.substances         ENABLE ROW LEVEL SECURITY;
ALTER TABLE synapedia.substance_sources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE synapedia.substance_jobs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE synapedia.domain_allowlist   ENABLE ROW LEVEL SECURITY;
ALTER TABLE synapedia.generated_articles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

-- substances
CREATE POLICY substances_select_authenticated ON synapedia.substances
    FOR SELECT TO authenticated USING (true);

CREATE POLICY substances_all_authenticated ON synapedia.substances
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- substance_sources
CREATE POLICY substance_sources_all_authenticated ON synapedia.substance_sources
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- substance_jobs
CREATE POLICY substance_jobs_all_authenticated ON synapedia.substance_jobs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- domain_allowlist
CREATE POLICY domain_allowlist_all_authenticated ON synapedia.domain_allowlist
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- generated_articles
CREATE POLICY generated_articles_all_authenticated ON synapedia.generated_articles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6. Seed Data
-- ============================================================

INSERT INTO synapedia.domain_allowlist (domain, enabled, rate_limit_ms) VALUES
    ('psychonautwiki.org', true, 2000),
    ('wikipedia.org', false, 1500)
ON CONFLICT (domain) DO NOTHING;
