-- ============================================================
-- 00001_initial_schema.sql
-- Initial database schema for Synapedia
-- ============================================================

-- Ensure all objects are created in the synapedia schema
SET search_path TO synapedia, public;

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. Tables
-- ============================================================

-- Articles
CREATE TABLE articles (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             text        UNIQUE NOT NULL,
    title            text        NOT NULL,
    subtitle         text,
    summary          text        NOT NULL,
    content_mdx      text        NOT NULL DEFAULT '',
    status           text        NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'review', 'published')),
    risk_level       text        NOT NULL DEFAULT 'moderate'
                                 CHECK (risk_level IN ('low', 'moderate', 'high')),
    evidence_strength text       NOT NULL DEFAULT 'moderate'
                                 CHECK (evidence_strength IN ('weak', 'moderate', 'strong')),
    category         text,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now(),
    published_at     timestamptz
);

-- Tags
CREATE TABLE tags (
    id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    slug text UNIQUE NOT NULL
);

-- Article ↔ Tag (many-to-many)
CREATE TABLE article_tags (
    article_id uuid REFERENCES articles ON DELETE CASCADE,
    tag_id     uuid REFERENCES tags     ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- Sources
CREATE TABLE sources (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text NOT NULL,
    authors     text,
    journal     text,
    year        int,
    doi         text,
    url         text,
    source_type text NOT NULL DEFAULT 'journal'
);

-- Article ↔ Source (many-to-many with citation order)
CREATE TABLE article_sources (
    article_id     uuid REFERENCES articles ON DELETE CASCADE,
    source_id      uuid REFERENCES sources  ON DELETE CASCADE,
    citation_order int  NOT NULL DEFAULT 0,
    PRIMARY KEY (article_id, source_id)
);

-- Article versions (revision history)
CREATE TABLE article_versions (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id     uuid        REFERENCES articles ON DELETE CASCADE,
    version_number int         NOT NULL,
    content_mdx    text        NOT NULL,
    title          text        NOT NULL,
    changed_by     uuid,
    change_summary text,
    created_at     timestamptz DEFAULT now()
);

-- Audit log
CREATE TABLE audit_log (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid,
    action      text        NOT NULL,
    entity_type text        NOT NULL,
    entity_id   uuid,
    details     jsonb,
    created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 3. Indexes
-- ============================================================

CREATE INDEX idx_articles_slug   ON articles (slug);
CREATE INDEX idx_articles_status ON articles (status);
CREATE INDEX idx_tags_slug       ON tags (slug);

-- ============================================================
-- 4. Functions
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Triggers
-- ============================================================

CREATE TRIGGER trg_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. Row Level Security
-- ============================================================

ALTER TABLE articles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources          ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_sources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. RLS Policies
-- ============================================================

-- articles -------------------------------------------------------
CREATE POLICY articles_select_published ON articles
    FOR SELECT
    TO anon, authenticated
    USING (status = 'published');

CREATE POLICY articles_all_authenticated ON articles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- tags -----------------------------------------------------------
CREATE POLICY tags_select_all ON tags
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY tags_all_authenticated ON tags
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- sources --------------------------------------------------------
CREATE POLICY sources_select_all ON sources
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY sources_all_authenticated ON sources
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- article_tags ---------------------------------------------------
CREATE POLICY article_tags_select_all ON article_tags
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY article_tags_all_authenticated ON article_tags
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- article_sources ------------------------------------------------
CREATE POLICY article_sources_select_all ON article_sources
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY article_sources_all_authenticated ON article_sources
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- article_versions -----------------------------------------------
CREATE POLICY article_versions_select_all ON article_versions
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY article_versions_insert_authenticated ON article_versions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- audit_log ------------------------------------------------------
CREATE POLICY audit_log_select_authenticated ON audit_log
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY audit_log_insert_authenticated ON audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
