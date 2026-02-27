-- ============================================================
-- 00023_neurocodex_user_layer.sql
-- Neurocodex: User Layer, Analytics & Synapedia Sync
-- ============================================================

SET search_path TO public;

-- ============================================================
-- 1. NEUROCODEX USER PREFERENCES
-- Personal settings & sensitivity flags for brain-graph overlays
-- ============================================================

CREATE TABLE IF NOT EXISTS nc_user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    sensitivity_flags jsonb NOT NULL DEFAULT '[]',
    display_settings jsonb NOT NULL DEFAULT '{}',
    harm_reduction_alerts boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

CREATE INDEX idx_nc_user_preferences_user ON nc_user_preferences (user_id);

-- ============================================================
-- 2. RISK SNAPSHOTS
-- Point-in-time risk assessments per user
-- ============================================================

CREATE TABLE IF NOT EXISTS nc_risk_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
    risk_score numeric CHECK (risk_score >= 0 AND risk_score <= 100),
    factors jsonb NOT NULL DEFAULT '{}',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nc_risk_snapshots_user ON nc_risk_snapshots (user_id, snapshot_date DESC);

-- ============================================================
-- 3. BEHAVIOR EVENTS
-- Privacy-aware analytics: searches, clicks, reading time
-- ============================================================

CREATE TABLE IF NOT EXISTS nc_behavior_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text,
    user_id uuid,
    event_type text NOT NULL CHECK (event_type IN (
        'search', 'click', 'page_view', 'reading_time',
        'graph_interact', 'comparison', 'interaction_check'
    )),
    event_data jsonb NOT NULL DEFAULT '{}',
    page_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nc_behavior_events_type ON nc_behavior_events (event_type, created_at DESC);
CREATE INDEX idx_nc_behavior_events_user ON nc_behavior_events (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;
CREATE INDEX idx_nc_behavior_events_session ON nc_behavior_events (session_id, created_at DESC)
    WHERE session_id IS NOT NULL;

-- ============================================================
-- 4. SYNC CONSUMERS
-- Track sync cursor state for Synapedia → Neurocodex pull sync
-- ============================================================

CREATE TABLE IF NOT EXISTS nc_sync_consumers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_name text NOT NULL UNIQUE,
    last_cursor text,
    last_sync_at timestamptz,
    entity_type text NOT NULL,
    config jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. SYNC EVENTS
-- Log every sync run for audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS nc_sync_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_id uuid NOT NULL REFERENCES nc_sync_consumers(id) ON DELETE CASCADE,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
    records_processed integer NOT NULL DEFAULT 0,
    cursor_before text,
    cursor_after text,
    details jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_nc_sync_events_consumer ON nc_sync_events (consumer_id, started_at DESC);

-- ============================================================
-- 6. SYNC ERRORS
-- Detailed error log for failed sync operations
-- ============================================================

CREATE TABLE IF NOT EXISTS nc_sync_errors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_event_id uuid NOT NULL REFERENCES nc_sync_events(id) ON DELETE CASCADE,
    entity_id text,
    error_message text NOT NULL,
    error_context jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nc_sync_errors_event ON nc_sync_errors (sync_event_id);

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE nc_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_risk_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_sync_consumers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_sync_errors ENABLE ROW LEVEL SECURITY;

-- User preferences: users can only see their own
CREATE POLICY nc_user_preferences_select ON nc_user_preferences
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY nc_user_preferences_insert ON nc_user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY nc_user_preferences_update ON nc_user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Risk snapshots: users can only see their own
CREATE POLICY nc_risk_snapshots_select ON nc_risk_snapshots
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY nc_risk_snapshots_insert ON nc_risk_snapshots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Behavior events: insert-only for anonymous, own-data for authenticated
CREATE POLICY nc_behavior_events_insert ON nc_behavior_events
    FOR INSERT WITH CHECK (true);
CREATE POLICY nc_behavior_events_select ON nc_behavior_events
    FOR SELECT USING (auth.uid() = user_id);

-- Sync tables: admin-only access
-- NOTE: Uses USING (true) consistent with existing codebase (see 00020_neurocodex_entities.sql).
-- Tighten with role checks (e.g. auth.jwt()->>'role' = 'admin') when auth roles are implemented.
CREATE POLICY nc_sync_consumers_all ON nc_sync_consumers
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY nc_sync_events_all ON nc_sync_events
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY nc_sync_errors_all ON nc_sync_errors
    FOR ALL USING (true) WITH CHECK (true);

-- Admin override policies (same pattern as existing codebase)
CREATE POLICY nc_user_preferences_admin ON nc_user_preferences
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY nc_risk_snapshots_admin ON nc_risk_snapshots
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY nc_behavior_events_admin ON nc_behavior_events
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 8. TRIGGERS
-- ============================================================

CREATE TRIGGER nc_user_preferences_updated_at BEFORE UPDATE ON nc_user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER nc_sync_consumers_updated_at BEFORE UPDATE ON nc_sync_consumers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
