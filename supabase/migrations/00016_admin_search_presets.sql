-- Admin Search Presets
-- Stores saved search presets for the Experience Search (Safety) module.
-- Admin-only access – no user PII, no secret tokens.

CREATE TABLE IF NOT EXISTS admin_search_presets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  name          text NOT NULL,
  substances    text[] NOT NULL,
  sources       text[] NOT NULL,
  mode          text NOT NULL,
  language      text NOT NULL,
  require_combo_terms boolean NOT NULL DEFAULT true,
  safesearch    boolean NOT NULL DEFAULT true,
  partymode     boolean NOT NULL DEFAULT false
);

-- RLS: admin-only access (service role key bypasses RLS; anon/public blocked)
ALTER TABLE admin_search_presets ENABLE ROW LEVEL SECURITY;

-- No policies for anon = no access from the public.
-- The admin panel uses the service-role key which bypasses RLS.
