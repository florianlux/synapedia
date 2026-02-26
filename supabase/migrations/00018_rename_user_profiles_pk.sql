-- ============================================================
-- 00018_rename_user_profiles_pk.sql
-- Rename user_profiles.user_id → user_profiles.id
-- Fixes: "Could not find the 'user_id' column of 'user_profiles'
--         in the schema cache" on signup.
-- ============================================================

SET search_path TO public;

-- 1) Rename the primary key column
ALTER TABLE public.user_profiles
  RENAME COLUMN user_id TO id;

-- 2) Update RLS policies that reference the old column name
DROP POLICY IF EXISTS user_profiles_insert_own ON user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON user_profiles;
DROP POLICY IF EXISTS user_profiles_delete_own ON user_profiles;

CREATE POLICY user_profiles_insert_own ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY user_profiles_update_own ON user_profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY user_profiles_delete_own ON user_profiles
    FOR DELETE TO authenticated
    USING (id = auth.uid());

-- 3) Update trigger functions to use id instead of user_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username, phone, newsletter_opt_in)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'newsletter_opt_in')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- 4) PostgREST schema cache reload
SELECT pg_notify('pgrst', 'reload schema');
