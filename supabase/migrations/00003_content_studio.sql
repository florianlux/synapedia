-- ============================================================
-- 00003_content_studio.sql
-- Content studio tables: templates, media, article_media,
-- AI jobs, and knowledge-graph edges
-- ============================================================

-- Ensure all objects are created in the public schema
SET search_path TO public;

-- ============================================================
-- 1. Tables
-- ============================================================

-- Templates
CREATE TABLE templates (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name         text        NOT NULL,
    slug         text        UNIQUE NOT NULL,
    schema_json  jsonb       NOT NULL DEFAULT '{}',
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

-- Media
CREATE TABLE media (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket     text        NOT NULL DEFAULT 'media',
    path       text        NOT NULL,
    url        text,
    width      int,
    height     int,
    alt        text,
    tags       text[]      DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Article ↔ Media (many-to-many)
CREATE TABLE article_media (
    article_id  uuid REFERENCES articles ON DELETE CASCADE,
    media_id    uuid REFERENCES media    ON DELETE CASCADE,
    role        text NOT NULL DEFAULT 'gallery',
    section_key text,
    sort        int  NOT NULL DEFAULT 0,
    created_at  timestamptz DEFAULT now(),
    PRIMARY KEY (article_id, media_id)
);

-- AI Jobs
CREATE TABLE ai_jobs (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    type        text        NOT NULL,
    status      text        NOT NULL DEFAULT 'queued'
                            CHECK (status IN ('queued', 'running', 'done', 'failed')),
    input_json  jsonb       NOT NULL DEFAULT '{}',
    output_json jsonb,
    error       text,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- Knowledge-Graph Edges
CREATE TABLE graph_edges (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id  uuid        REFERENCES articles ON DELETE CASCADE,
    from_type   text        NOT NULL,
    from_key    text        NOT NULL,
    to_type     text        NOT NULL,
    to_key      text        NOT NULL,
    relation    text        NOT NULL,
    confidence  numeric     DEFAULT 0.5
                            CHECK (confidence >= 0 AND confidence <= 1),
    origin      text        NOT NULL DEFAULT 'manual',
    created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 2. Alter articles table
-- ============================================================

ALTER TABLE articles ADD COLUMN IF NOT EXISTS template_id   uuid  REFERENCES templates(id) ON DELETE SET NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_json  jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_json     jsonb;

-- ============================================================
-- 3. Indexes
-- ============================================================

CREATE INDEX idx_templates_slug       ON templates (slug);
CREATE INDEX idx_ai_jobs_status       ON ai_jobs (status);
CREATE INDEX idx_graph_edges_article  ON graph_edges (article_id);
CREATE INDEX idx_article_media_article ON article_media (article_id);

-- ============================================================
-- 4. Triggers (reuse update_updated_at_column from 00001)
-- ============================================================

CREATE TRIGGER trg_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ai_jobs_updated_at
    BEFORE UPDATE ON ai_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. Row Level Security
-- ============================================================

ALTER TABLE templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE media         ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS Policies
-- ============================================================

-- templates ------------------------------------------------------
CREATE POLICY templates_select_all ON templates
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY templates_all_authenticated ON templates
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- media ----------------------------------------------------------
CREATE POLICY media_select_all ON media
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY media_all_authenticated ON media
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- article_media --------------------------------------------------
CREATE POLICY article_media_select_all ON article_media
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY article_media_all_authenticated ON article_media
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ai_jobs --------------------------------------------------------
CREATE POLICY ai_jobs_select_authenticated ON ai_jobs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY ai_jobs_insert_authenticated ON ai_jobs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- graph_edges ----------------------------------------------------
CREATE POLICY graph_edges_select_all ON graph_edges
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY graph_edges_all_authenticated ON graph_edges
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
