-- Migration: Ensure external_ids column exists with jsonb default
-- Adds the column if it was not already created by migration 00005.

ALTER TABLE public.substances
  ADD COLUMN IF NOT EXISTS external_ids jsonb DEFAULT '{}'::jsonb;
