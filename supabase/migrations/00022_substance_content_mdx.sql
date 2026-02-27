-- Migration: Add content_mdx and last_generated_at to substances
-- Allows storing generated article content directly on the substance row.

ALTER TABLE public.substances
  ADD COLUMN IF NOT EXISTS content_mdx text DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_generated_at timestamptz;

-- Ensure articles table also has a last_generated_at for tracking generation
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS last_generated_at timestamptz;
