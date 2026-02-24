-- Migration: Ensure all substance JSON columns are jsonb, add meta column, disable RLS
-- Converts categories from text[] to jsonb and adds meta jsonb column.

-- 1) Convert categories from text[] to jsonb (preserves existing array data)
ALTER TABLE public.substances
  ALTER COLUMN categories TYPE jsonb USING to_jsonb(categories),
  ALTER COLUMN categories SET DEFAULT '[]'::jsonb;

-- 2) Add meta jsonb column
ALTER TABLE public.substances
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- 3) Disable RLS on substances to allow service-role writes without policy checks
ALTER TABLE public.substances DISABLE ROW LEVEL SECURITY;
