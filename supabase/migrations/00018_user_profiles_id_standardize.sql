-- ============================================================
-- 00018_user_profiles_id_standardize.sql
-- Standardize user_profiles: rename user_id → id, update trigger,
-- RLS policies, and reload PostgREST schema cache.
--
-- Option A: keep ONLY "id" as the PK/FK to auth.users(id).
-- The trigger (handle_new_user) creates profiles automatically;
-- clients should NOT insert into user_profiles during signup.
-- ============================================================

SET search_path TO public;

-- ============================================================
-- 1. Schema migration: user_id → id
-- ============================================================

-- Drop existing RLS policies that reference user_id
DROP POLICY IF EXISTS user_profiles_insert_own ON user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON user_profiles;
DROP POLICY IF EXISTS user_profiles_delete_own ON user_profiles;
DROP POLICY IF EXISTS user_profiles_select_public ON user_profiles;

-- Drop existing triggers on user_profiles that may conflict
DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;

-- Drop the unique index on lower(username) so we can recreate it later
DROP INDEX IF EXISTS idx_user_profiles_username_lower;

-- Handle schema: rename user_id to id (if user_id exists and id does not)
DO $$
BEGIN
  -- Case 1: both id and user_id exist → drop user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'user_id'
  ) THEN
    -- Ensure id is populated from user_id where null
    UPDATE user_profiles SET id = user_id WHERE id IS NULL;
    -- Drop PK constraint (name may vary)
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_pkey;
    -- Drop user_id column
    ALTER TABLE user_profiles DROP COLUMN user_id;
    -- Add PK on id
    ALTER TABLE user_profiles ADD PRIMARY KEY (id);

  -- Case 2: only user_id exists → rename to id
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'id'
  ) THEN
    ALTER TABLE user_profiles RENAME COLUMN user_id TO id;
  END IF;
END;
$$;

-- Ensure id column has NOT NULL and PK
ALTER TABLE user_profiles ALTER COLUMN id SET NOT NULL;

-- Ensure FK to auth.users(id) exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'user_profiles_id_fkey'
  ) THEN
    -- Drop old FK if named differently
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Ensure required columns exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS newsletter_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Allow username to be nullable (for OAuth users who haven't set one yet)
ALTER TABLE user_profiles ALTER COLUMN username DROP NOT NULL;

-- Recreate unique index on lower(username)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_lower
  ON user_profiles (lower(username)) WHERE username IS NOT NULL;

-- ============================================================
-- 2. updated_at auto-trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. handle_new_user trigger (SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username, phone, newsletter_opt_in)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone',
    coalesce((NEW.raw_user_meta_data->>'newsletter_opt_in')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. RLS policies (using id instead of user_id)
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY user_profiles_select_own ON user_profiles
  FOR SELECT TO anon, authenticated
  USING (auth.uid() = id);

-- Owner can update own profile
CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Owner can delete own profile
CREATE POLICY user_profiles_delete_own ON user_profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- ============================================================
-- 5. PostgREST schema cache reload
-- ============================================================

SELECT pg_notify('pgrst', 'reload schema');
