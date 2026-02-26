-- Dosing logs table and auto-create user_profiles trigger on auth signup
-- dosing_logs: per-user substance intake journal with RLS
-- handle_new_user(): creates a user_profiles row on first sign-up

SET search_path TO public;

-- 1. dosing_logs table
CREATE TABLE IF NOT EXISTS dosing_logs (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    substance   text        NOT NULL,
    dose_mg     numeric,
    dose_g      numeric,
    route       text,
    notes       text,
    taken_at    timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dosing_logs_user_taken ON dosing_logs (user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_dosing_logs_substance ON dosing_logs (substance);

-- 2. Row Level Security – users can CRUD their own rows only
ALTER TABLE dosing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY dosing_logs_select_own ON dosing_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY dosing_logs_insert_own ON dosing_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY dosing_logs_update_own ON dosing_logs
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY dosing_logs_delete_own ON dosing_logs
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 3. Auto-create user_profiles row on auth sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, username)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)))
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND tgrelid = 'auth.users'::regclass
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
    END IF;
END;
$$;
