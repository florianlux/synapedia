-- Migration: Bulk Substance Generator tables
-- Creates substances, substance_sources, and reddit_reports in the public schema

-- 1) substances
CREATE TABLE IF NOT EXISTS public.substances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  categories  text[] DEFAULT '{}',
  summary     text DEFAULT '',
  mechanism   text DEFAULT '',
  effects     jsonb DEFAULT '{"positive":[],"neutral":[],"negative":[]}',
  risks       jsonb DEFAULT '{"acute":[],"chronic":[],"contraindications":[]}',
  interactions jsonb DEFAULT '{"high_risk_pairs":[],"notes":[]}',
  dependence  jsonb DEFAULT '{"potential":"unknown","notes":[]}',
  legality    jsonb DEFAULT '{"germany":"unknown","notes":[]}',
  citations   jsonb DEFAULT '{}',
  confidence  jsonb DEFAULT '{}',
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_substances_slug ON public.substances (slug);
CREATE INDEX IF NOT EXISTS idx_substances_status ON public.substances (status);

-- 2) substance_sources
CREATE TABLE IF NOT EXISTS public.substance_sources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_id  uuid NOT NULL REFERENCES public.substances(id) ON DELETE CASCADE,
  source_name   text NOT NULL DEFAULT '',
  source_url    text NOT NULL DEFAULT '',
  source_type   text NOT NULL DEFAULT 'other' CHECK (source_type IN ('psychonautwiki','drugcom','pubmed','reddit','other')),
  retrieved_at  timestamptz NOT NULL DEFAULT now(),
  snippet       text DEFAULT '',
  snippet_hash  text DEFAULT '',
  license_note  text DEFAULT '',
  confidence    float DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_substance_sources_substance ON public.substance_sources (substance_id);

-- 3) reddit_reports
CREATE TABLE IF NOT EXISTS public.reddit_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_id    uuid NOT NULL REFERENCES public.substances(id) ON DELETE CASCADE,
  reddit_post_id  text DEFAULT '',
  title           text DEFAULT '',
  subreddit       text DEFAULT '',
  url             text DEFAULT '',
  created_utc     timestamptz,
  upvotes         int DEFAULT 0,
  sentiment       float DEFAULT 0,
  themes          text[] DEFAULT '{}',
  risk_flags      text[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_reddit_reports_substance ON public.reddit_reports (substance_id);

-- RLS policies
ALTER TABLE public.substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substance_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reddit_reports ENABLE ROW LEVEL SECURITY;

-- Allow anon read on substances
CREATE POLICY substances_select ON public.substances FOR SELECT USING (true);
CREATE POLICY substances_all ON public.substances FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY substance_sources_select ON public.substance_sources FOR SELECT USING (true);
CREATE POLICY substance_sources_all ON public.substance_sources FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY reddit_reports_select ON public.reddit_reports FOR SELECT USING (true);
CREATE POLICY reddit_reports_all ON public.reddit_reports FOR ALL USING (true) WITH CHECK (true);
