-- ============================================================
-- Migration 00014: SEO Documents
-- One SEO document per slug/entity for clean, dedicated SEO data.
-- ============================================================

-- 1) Main table: public.seo_documents
CREATE TABLE IF NOT EXISTS public.seo_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  entity_type   text NOT NULL DEFAULT 'article',  -- 'article', 'substance', 'glossary', 'page'
  title         text,                               -- <title> override
  description   text,                               -- meta description override
  canonical_url text,                               -- canonical URL override
  og_title      text,
  og_description text,
  og_image_url  text,
  robots        text NOT NULL DEFAULT 'index, follow',
  keywords      text[],                             -- meta keywords array
  structured_data jsonb,                            -- custom JSON-LD overrides
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT seo_documents_slug_entity_unique UNIQUE (slug, entity_type)
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_seo_documents_slug ON public.seo_documents (slug);
CREATE INDEX IF NOT EXISTS idx_seo_documents_entity_type ON public.seo_documents (entity_type);

-- 3) Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.seo_documents_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seo_documents_updated_at
  BEFORE UPDATE ON public.seo_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.seo_documents_set_updated_at();

-- 4) Enable RLS
ALTER TABLE public.seo_documents ENABLE ROW LEVEL SECURITY;

-- Public read for indexable pages (robots contains 'index')
CREATE POLICY "seo_documents_public_read"
  ON public.seo_documents
  FOR SELECT
  USING (robots ILIKE '%index%');

-- Full access for authenticated users (admin via service role key)
CREATE POLICY "seo_documents_admin_all"
  ON public.seo_documents
  FOR ALL
  USING (true)
  WITH CHECK (true);
