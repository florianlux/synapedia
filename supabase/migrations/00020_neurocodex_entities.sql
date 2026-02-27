-- ============================================================
-- 00020_neurocodex_entities.sql
-- Neurocodex Entity-Based Architecture
-- Shared core schema for both Synapedia and Neurocodex platforms
-- ============================================================

SET search_path TO public;

-- ============================================================
-- 1. ENTITIES TABLE
-- Core entity table for compounds, nootropics, neurotransmitters, pathways
-- ============================================================

CREATE TABLE IF NOT EXISTS entities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    entity_type text NOT NULL CHECK (entity_type IN ('compound', 'nootropic', 'neurotransmitter', 'pathway')),
    description text,
    scientific_level text,
    risk_level text CHECK (risk_level IN ('low', 'moderate', 'high', 'unknown')),
    evidence_score numeric CHECK (evidence_score >= 0 AND evidence_score <= 100),
    evidence_grade text CHECK (evidence_grade IN ('A+', 'A', 'B', 'C', 'N/A')),
    -- Metadata
    meta_data jsonb DEFAULT '{}',
    -- Timestamps
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entities_slug ON entities (slug);
CREATE INDEX idx_entities_type ON entities (entity_type);
CREATE INDEX idx_entities_evidence_score ON entities (evidence_score DESC) WHERE evidence_score IS NOT NULL;

-- ============================================================
-- 2. MECHANISMS TABLE
-- Pharmacological mechanisms of action for each entity
-- ============================================================

CREATE TABLE IF NOT EXISTS mechanisms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    neurotransmitter text NOT NULL,
    action_type text NOT NULL,
    strength numeric CHECK (strength >= 0 AND strength <= 1),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mechanisms_entity ON mechanisms (entity_id);
CREATE INDEX idx_mechanisms_neurotransmitter ON mechanisms (neurotransmitter);

-- ============================================================
-- 3. EVIDENCE SOURCES TABLE
-- Scientific evidence backing for entities
-- ============================================================

CREATE TABLE IF NOT EXISTS evidence_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    study_type text NOT NULL CHECK (study_type IN ('meta', 'rct', 'animal', 'in-vitro', 'anecdotal')),
    sample_size integer,
    summary text,
    pubmed_id text,
    doi text,
    url text,
    quality_score numeric CHECK (quality_score >= 0 AND quality_score <= 10),
    confidence_level text CHECK (confidence_level IN ('high', 'medium', 'low')),
    year integer,
    authors text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_sources_entity ON evidence_sources (entity_id);
CREATE INDEX idx_evidence_sources_study_type ON evidence_sources (study_type);
CREATE INDEX idx_evidence_sources_quality ON evidence_sources (quality_score DESC) WHERE quality_score IS NOT NULL;

-- ============================================================
-- 4. AFFILIATE PROVIDERS TABLE
-- Vetted providers for nootropic sourcing
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    website text NOT NULL,
    region text NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    lab_tested boolean NOT NULL DEFAULT false,
    quality_rating numeric CHECK (quality_rating >= 0 AND quality_rating <= 5),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_providers_region ON affiliate_providers (region);
CREATE INDEX idx_affiliate_providers_verified ON affiliate_providers (verified);

-- ============================================================
-- 5. AFFILIATE LINKS TABLE
-- Entity-to-provider affiliate relationships
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    provider_id uuid NOT NULL REFERENCES affiliate_providers(id) ON DELETE CASCADE,
    affiliate_url text NOT NULL,
    price_range text,
    quality_score numeric CHECK (quality_score >= 0 AND quality_score <= 5),
    active boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (entity_id, provider_id)
);

CREATE INDEX idx_affiliate_links_entity ON affiliate_links (entity_id);
CREATE INDEX idx_affiliate_links_provider ON affiliate_links (provider_id);
CREATE INDEX idx_affiliate_links_active ON affiliate_links (active) WHERE active = true;

-- ============================================================
-- 6. STACKS TABLE
-- Curated nootropic stacks for specific goals
-- ============================================================

CREATE TABLE IF NOT EXISTS stacks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    goal text NOT NULL CHECK (goal IN ('focus', 'sleep', 'stress', 'neuroprotection', 'memory', 'mood', 'energy', 'general')),
    description text,
    evidence_score numeric CHECK (evidence_score >= 0 AND evidence_score <= 100),
    evidence_grade text CHECK (evidence_grade IN ('A+', 'A', 'B', 'C', 'N/A')),
    target_budget_range text,
    sensitivity_level text CHECK (sensitivity_level IN ('low', 'medium', 'high')),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stacks_slug ON stacks (slug);
CREATE INDEX idx_stacks_goal ON stacks (goal);
CREATE INDEX idx_stacks_status ON stacks (status);

-- ============================================================
-- 7. STACK COMPONENTS TABLE
-- Individual components within a stack
-- ============================================================

CREATE TABLE IF NOT EXISTS stack_components (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stack_id uuid NOT NULL REFERENCES stacks(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    dose_range text,
    timing text,
    priority integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (stack_id, entity_id)
);

CREATE INDEX idx_stack_components_stack ON stack_components (stack_id);
CREATE INDEX idx_stack_components_entity ON stack_components (entity_id);
CREATE INDEX idx_stack_components_priority ON stack_components (stack_id, priority);

-- ============================================================
-- 8. ADMIN CONFIGURATION TABLE
-- System-wide configuration for monetization and thresholds
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key text NOT NULL UNIQUE,
    config_value jsonb NOT NULL,
    description text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default configuration values
INSERT INTO admin_config (config_key, config_value, description)
VALUES
    ('smart_linking_threshold', '50', 'Global evidence score threshold for smart linking'),
    ('affiliate_enabled', 'false', 'Global toggle for affiliate links'),
    ('stack_builder_enabled', 'true', 'Enable stack builder feature'),
    ('regional_priority', '["EU", "US", "UK"]', 'Regional priority order for affiliate routing')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- 9. ANALYTICS TABLE
-- Track clicks and conversions for affiliate links
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
    provider_id uuid REFERENCES affiliate_providers(id) ON DELETE SET NULL,
    affiliate_link_id uuid REFERENCES affiliate_links(id) ON DELETE SET NULL,
    event_type text NOT NULL CHECK (event_type IN ('click', 'view', 'conversion')),
    page_url text,
    user_agent text,
    ip_hash text,
    referrer text,
    region text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_analytics_entity ON affiliate_analytics (entity_id, created_at DESC);
CREATE INDEX idx_affiliate_analytics_provider ON affiliate_analytics (provider_id, created_at DESC);
CREATE INDEX idx_affiliate_analytics_type ON affiliate_analytics (event_type, created_at DESC);

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_analytics ENABLE ROW LEVEL SECURITY;

-- Public read access for entities and related data
CREATE POLICY entities_select ON entities FOR SELECT USING (true);
CREATE POLICY mechanisms_select ON mechanisms FOR SELECT USING (true);
CREATE POLICY evidence_sources_select ON evidence_sources FOR SELECT USING (true);
CREATE POLICY stacks_select ON stacks FOR SELECT USING (status = 'published');
CREATE POLICY stack_components_select ON stack_components FOR SELECT USING (
    stack_id IN (SELECT id FROM stacks WHERE status = 'published')
);

-- Only show active affiliate links
CREATE POLICY affiliate_providers_select ON affiliate_providers FOR SELECT USING (verified = true);
CREATE POLICY affiliate_links_select ON affiliate_links FOR SELECT USING (active = true);

-- Admin config read-only for all
CREATE POLICY admin_config_select ON admin_config FOR SELECT USING (true);

-- Analytics: insert only (no read for public)
CREATE POLICY affiliate_analytics_insert ON affiliate_analytics FOR INSERT WITH CHECK (true);

-- Admin ALL policies (requires proper auth implementation)
CREATE POLICY entities_all ON entities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY mechanisms_all ON mechanisms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY evidence_sources_all ON evidence_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY affiliate_providers_all ON affiliate_providers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY affiliate_links_all ON affiliate_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY stacks_all ON stacks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY stack_components_all ON stack_components FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY admin_config_all ON admin_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY affiliate_analytics_all ON affiliate_analytics FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 11. TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entities_updated_at BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mechanisms_updated_at BEFORE UPDATE ON mechanisms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER evidence_sources_updated_at BEFORE UPDATE ON evidence_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER affiliate_providers_updated_at BEFORE UPDATE ON affiliate_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER affiliate_links_updated_at BEFORE UPDATE ON affiliate_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER stacks_updated_at BEFORE UPDATE ON stacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER admin_config_updated_at BEFORE UPDATE ON admin_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
