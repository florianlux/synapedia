-- ============================================================
-- 00017_user_profiles_email_signup_hook.sql
-- Add email column to user_profiles + signup hook trigger
-- ============================================================

SET search_path TO public;

-- 1) Extension (if not already present)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Add email column to existing user_profiles table
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email text;

-- 3) Signup Hook: auto-create profile when a new auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, username, phone, newsletter_opt_in)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', null),
    coalesce(new.raw_user_meta_data->>'phone', null),
    coalesce((new.raw_user_meta_data->>'newsletter_opt_in')::boolean, false)
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Policies for own-profile access (idempotent re-creation)
--    These supplement the existing policies from 00013.
--    The existing policies already cover SELECT/INSERT/UPDATE/DELETE
--    for authenticated users using user_id = auth.uid(), so no new
--    policies are needed.

-- 5) PostgREST schema cache reload
SELECT pg_notify('pgrst', 'reload schema');
