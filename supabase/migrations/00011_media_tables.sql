-- Migration: Media & Article-Media tables
-- Creates the media and article_media tables used by src/lib/db/media.ts

-- 1) media
CREATE TABLE IF NOT EXISTS public.media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket      text NOT NULL DEFAULT 'media',
  path        text NOT NULL,
  url         text,
  width       int,
  height      int,
  alt         text,
  tags        text[] DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_created_at ON public.media (created_at DESC);

-- 2) article_media (many-to-many between articles and media)
CREATE TABLE IF NOT EXISTS public.article_media (
  article_id  uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  media_id    uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'gallery',
  section_key text,
  sort        int NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_article_media_article ON public.article_media (article_id);

-- RLS policies
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_select ON public.media FOR SELECT USING (true);
CREATE POLICY media_all ON public.media FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY article_media_select ON public.article_media FOR SELECT USING (true);
CREATE POLICY article_media_all ON public.article_media FOR ALL USING (true) WITH CHECK (true);
