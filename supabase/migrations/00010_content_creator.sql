-- ============================================================
-- 00010_content_creator.sql
-- Content Creator & Publisher system tables:
--   generated_articles, article_templates, publish_jobs,
--   media_assets, plus extensions to substances
-- ============================================================

SET search_path TO public;

-- ============================================================
-- 1. article_templates – MDX templates + optional LLM prompts
-- ============================================================

CREATE TABLE IF NOT EXISTS article_templates (
    key             text        PRIMARY KEY,
    name            text        NOT NULL,
    description     text        DEFAULT '',
    enabled         boolean     DEFAULT true,
    template_mdx    text        NOT NULL DEFAULT '',
    prompt_system   text        DEFAULT '',
    prompt_user     text        DEFAULT '',
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE TRIGGER trg_article_templates_updated_at
    BEFORE UPDATE ON article_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. generated_articles – drafts before becoming real articles
-- ============================================================

CREATE TABLE IF NOT EXISTS generated_articles (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    substance_id    uuid        REFERENCES substances(id) ON DELETE CASCADE,
    template_key    text        REFERENCES article_templates(key) ON DELETE SET NULL,
    article_id      uuid        REFERENCES articles(id) ON DELETE SET NULL,
    status          text        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','review','published','blocked')),
    content_mdx     text        NOT NULL DEFAULT '',
    citations       jsonb       DEFAULT '[]'::jsonb,
    blocked_reasons text[]      DEFAULT '{}',
    model_info      jsonb       DEFAULT '{}'::jsonb,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_generated_articles_substance ON generated_articles (substance_id);
CREATE INDEX idx_generated_articles_status    ON generated_articles (status);

CREATE TRIGGER trg_generated_articles_updated_at
    BEFORE UPDATE ON generated_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. media_assets – cover images, molecule structures, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS media_assets (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    kind            text        NOT NULL DEFAULT 'cover'
                                CHECK (kind IN ('cover','structure','illustration')),
    substance_id    uuid        REFERENCES substances(id) ON DELETE CASCADE,
    source_url      text        DEFAULT '',
    credit          text        DEFAULT '',
    license         text        DEFAULT '',
    license_url     text        DEFAULT '',
    storage_path    text        DEFAULT '',
    width           int,
    height          int,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_media_assets_substance ON media_assets (substance_id);

-- ============================================================
-- 4. publish_jobs – queue for batch operations
-- ============================================================

CREATE TABLE IF NOT EXISTS publish_jobs (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    type            text        NOT NULL
                                CHECK (type IN ('import','enrich','generate','media_fetch','map_to_article','publish','batch')),
    status          text        NOT NULL DEFAULT 'queued'
                                CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
    payload         jsonb       NOT NULL DEFAULT '{}'::jsonb,
    substance_id    uuid        REFERENCES substances(id) ON DELETE SET NULL,
    attempts        int         DEFAULT 0,
    max_attempts    int         DEFAULT 3,
    error           text,
    result_json     jsonb,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    started_at      timestamptz,
    finished_at     timestamptz
);

CREATE INDEX idx_publish_jobs_status ON publish_jobs (status);
CREATE INDEX idx_publish_jobs_type   ON publish_jobs (type);

CREATE TRIGGER trg_publish_jobs_updated_at
    BEFORE UPDATE ON publish_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. RLS (permissive for MVP; tighten later with is_admin())
-- ============================================================

ALTER TABLE article_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_articles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_jobs        ENABLE ROW LEVEL SECURITY;

-- article_templates
CREATE POLICY article_templates_select ON article_templates
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY article_templates_all ON article_templates
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- generated_articles (only authenticated can read, to prevent exposure of drafts/blocked content)
CREATE POLICY generated_articles_select ON generated_articles
    FOR SELECT TO authenticated USING (true);
CREATE POLICY generated_articles_all ON generated_articles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- media_assets
CREATE POLICY media_assets_select ON media_assets
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY media_assets_all ON media_assets
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- publish_jobs
CREATE POLICY publish_jobs_select ON publish_jobs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY publish_jobs_all ON publish_jobs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
