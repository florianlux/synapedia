-- ============================================================
-- 00002_categories.sql
-- Add categories table for Synapedia
-- ============================================================

-- Ensure all objects are created in the public schema
SET search_path TO public;

CREATE TABLE categories (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        UNIQUE NOT NULL,
    slug        text        UNIQUE NOT NULL,
    description text,
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_categories_slug ON categories (slug);

-- Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_select_all ON categories
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY categories_all_authenticated ON categories
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
