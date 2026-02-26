-- Migration: dosing_logs table + profile auto-insert trigger
-- Part of the Harm-Reduction Risk Overlay feature

-- ============================================================
-- Table: dosing_logs
-- Private per-user dosing log for risk overlay computation
-- ============================================================
CREATE TABLE IF NOT EXISTS dosing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  substance text NOT NULL,
  dose_mg numeric NULL,
  dose_g numeric NULL,
  route text NULL,
  notes text NULL,
  taken_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_dosing_logs_user_taken
  ON dosing_logs (user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_dosing_logs_substance
  ON dosing_logs (substance);

-- ============================================================
-- RLS: dosing_logs — user can CRUD only their own rows
-- ============================================================
ALTER TABLE dosing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY dosing_logs_select ON dosing_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY dosing_logs_insert ON dosing_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY dosing_logs_update ON dosing_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY dosing_logs_delete ON dosing_logs
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Trigger: auto-insert user_profiles row on new auth.users signup
-- (only if row doesn't already exist)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username, newsletter_opt_in)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'user_' || left(NEW.id::text, 8)),
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
