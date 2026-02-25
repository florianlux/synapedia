-- ============================================================
-- 00014_articles_content_html.sql
-- Add content_html column to articles for pre-rendered HTML output.
-- Ensures content_mdx, content_html, status, published_at all exist.
-- ============================================================

SET search_path TO public;

-- content_mdx, status, published_at already exist from 00001_initial_schema.sql.
-- Add content_html as an optional pre-rendered HTML cache column.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_html TEXT;
