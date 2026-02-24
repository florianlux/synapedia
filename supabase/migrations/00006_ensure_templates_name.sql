-- ============================================================
-- 00006_ensure_templates_name.sql
-- Ensure templates table has the expected name column
-- (safety net in case migration 00003 was applied without it)
-- ============================================================

ALTER TABLE templates ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
