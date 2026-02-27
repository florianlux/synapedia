-- ============================================================
-- Phase 2: Smart Monetization Layer – Affiliate Providers
-- ============================================================

-- Entities table: substances/compounds that can be linked
-- (extends the existing substance concept with monetization metadata)
CREATE TABLE IF NOT EXISTS entities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  synonyms      text[] NOT NULL DEFAULT '{}',
  entity_type   text NOT NULL DEFAULT 'substance',      -- substance | supplement | tool
  evidence_score integer NOT NULL DEFAULT 0 CHECK (evidence_score >= 0 AND evidence_score <= 100),
  risk_level    text NOT NULL DEFAULT 'unknown',         -- low | moderate | high | unknown
  monetization_enabled boolean NOT NULL DEFAULT false,
  autolink_whitelisted boolean NOT NULL DEFAULT false,   -- explicit whitelist for high-risk entities
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entities_slug ON entities (slug);
CREATE INDEX idx_entities_monetization ON entities (monetization_enabled) WHERE monetization_enabled = true;

-- Affiliate providers: verified vendors/labs
CREATE TABLE IF NOT EXISTS affiliate_providers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  website_url     text NOT NULL,
  logo_url        text,
  description     text,
  verified        boolean NOT NULL DEFAULT false,
  active          boolean NOT NULL DEFAULT true,
  quality_score   integer NOT NULL DEFAULT 50 CHECK (quality_score >= 0 AND quality_score <= 100),
  region          text NOT NULL DEFAULT 'global',       -- global | EU | US | DE | etc.
  price_range     text,                                  -- budget | mid | premium
  affiliate_tag   text,                                  -- our affiliate identifier
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_providers_active ON affiliate_providers (active) WHERE active = true;
CREATE INDEX idx_affiliate_providers_region ON affiliate_providers (region);

-- Junction: which providers supply which entities
CREATE TABLE IF NOT EXISTS entity_provider_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  provider_id     uuid NOT NULL REFERENCES affiliate_providers(id) ON DELETE CASCADE,
  affiliate_url   text NOT NULL,
  custom_label    text,                                  -- optional override label
  priority        integer NOT NULL DEFAULT 0,            -- manual boost/demote
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, provider_id)
);

CREATE INDEX idx_entity_provider_entity ON entity_provider_links (entity_id) WHERE active = true;
CREATE INDEX idx_entity_provider_provider ON entity_provider_links (provider_id);

-- RLS policies
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_provider_links ENABLE ROW LEVEL SECURITY;

-- Public read for entities (needed for autolink)
CREATE POLICY entities_public_read ON entities
  FOR SELECT USING (true);

-- Public read for active providers
CREATE POLICY affiliate_providers_public_read ON affiliate_providers
  FOR SELECT USING (active = true);

-- Public read for active links
CREATE POLICY entity_provider_links_public_read ON entity_provider_links
  FOR SELECT USING (active = true);

-- Service role full access
CREATE POLICY entities_service_all ON entities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY affiliate_providers_service_all ON affiliate_providers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY entity_provider_links_service_all ON entity_provider_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);
