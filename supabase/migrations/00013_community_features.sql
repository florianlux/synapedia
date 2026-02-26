-- ============================================================
-- 00013_community_features.sql  
-- Community features: user profiles, feed, favorites, logs
-- ============================================================

SET search_path TO public;

-- ============================================================
-- 1. Tables
-- ============================================================

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        text        UNIQUE NOT NULL,
    phone           text,
    bio             text,
    avatar_url      text,
    newsletter_opt_in boolean   NOT NULL DEFAULT false,
    favorite_tags   text[]      NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_lower 
    ON user_profiles (lower(username));

-- Feed Posts
CREATE TABLE IF NOT EXISTS feed_posts (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           text,
    body            text        NOT NULL,
    tags            text[]      NOT NULL DEFAULT '{}',
    substance_id    uuid        REFERENCES substances(id) ON DELETE SET NULL,
    visibility      text        NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted')),
    status          text        NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'flagged', 'deleted')),
    deleted_at      timestamptz,
    deleted_by      uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON feed_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON feed_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_substance ON feed_posts (substance_id) WHERE substance_id IS NOT NULL;

-- Feed Post Votes
CREATE TABLE IF NOT EXISTS feed_post_votes (
    post_id         uuid        NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    value           int         NOT NULL DEFAULT 1,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

-- Substance Favorites
CREATE TABLE IF NOT EXISTS substance_favorites (
    substance_id    uuid        NOT NULL REFERENCES substances(id) ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (substance_id, user_id)
);

-- User Logs (private tracking)
CREATE TABLE IF NOT EXISTS user_logs (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    occurred_at     timestamptz NOT NULL,
    entry_type      text        NOT NULL CHECK (entry_type IN ('medication', 'use')),
    substance_id    uuid        REFERENCES substances(id) ON DELETE SET NULL,
    substance_name  text,
    dose_value      numeric,
    dose_unit       text,
    route           text,
    notes           text,
    safer_use_notes text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_logs_user ON user_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_occurred ON user_logs (user_id, occurred_at DESC);

-- User Follows (stub for future use)
CREATE TABLE IF NOT EXISTS user_follows (
    follower_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- ============================================================
-- 2. Triggers
-- ============================================================

CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_feed_posts_updated_at
    BEFORE UPDATE ON feed_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. Row Level Security
-- ============================================================

ALTER TABLE user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_votes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE substance_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows       ENABLE ROW LEVEL SECURITY;

-- user_profiles: owner can read/update own; public can see username+avatar
CREATE POLICY user_profiles_select_public ON user_profiles
    FOR SELECT TO anon, authenticated
    USING (true);

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

-- feed_posts: public SELECT on published+public; INSERT/UPDATE only owner
CREATE POLICY feed_posts_select_public ON feed_posts
    FOR SELECT TO anon, authenticated
    USING (status = 'published' AND visibility = 'public');

CREATE POLICY feed_posts_insert_own ON feed_posts
    FOR INSERT TO authenticated
    WITH CHECK (author_id = auth.uid());

CREATE POLICY feed_posts_update_own ON feed_posts
    FOR UPDATE TO authenticated
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

-- feed_post_votes: user can manage own votes; public can see aggregations
CREATE POLICY feed_post_votes_select_all ON feed_post_votes
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY feed_post_votes_insert_own ON feed_post_votes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY feed_post_votes_delete_own ON feed_post_votes
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- substance_favorites: only owner
CREATE POLICY substance_favorites_select_own ON substance_favorites
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY substance_favorites_insert_own ON substance_favorites
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY substance_favorites_delete_own ON substance_favorites
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- user_logs: strictly owner only
CREATE POLICY user_logs_select_own ON user_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY user_logs_insert_own ON user_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY user_logs_update_own ON user_logs
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY user_logs_delete_own ON user_logs
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- user_follows: only owner can manage
CREATE POLICY user_follows_select_all ON user_follows
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY user_follows_insert_own ON user_follows
    FOR INSERT TO authenticated
    WITH CHECK (follower_id = auth.uid());

CREATE POLICY user_follows_delete_own ON user_follows
    FOR DELETE TO authenticated
    USING (follower_id = auth.uid());
