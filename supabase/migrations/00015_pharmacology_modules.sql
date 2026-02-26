-- Migration: Pharmacology modules (Receptor Heatmap, PK/PD Curves, Dose-Response)

-- 1) targets
CREATE TABLE IF NOT EXISTS public.targets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  family      text NOT NULL DEFAULT 'other',
  description text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_targets_family ON public.targets (family);
CREATE INDEX IF NOT EXISTS idx_targets_slug ON public.targets (slug);

-- 2) substance_target_affinity
CREATE TABLE IF NOT EXISTS public.substance_target_affinity (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_id     uuid NOT NULL REFERENCES public.substances(id) ON DELETE CASCADE,
  target_id        uuid NOT NULL REFERENCES public.targets(id) ON DELETE CASCADE,
  measure_type     text NOT NULL DEFAULT 'Ki' CHECK (measure_type IN ('Ki','IC50','EC50','qualitative')),
  affinity_nm      numeric,
  effect_type      text CHECK (effect_type IN ('agonist','antagonist','partial_agonist','inhibitor','releaser','modulator','unknown')),
  efficacy         numeric CHECK (efficacy IS NULL OR (efficacy >= 0 AND efficacy <= 100)),
  confidence_level text NOT NULL DEFAULT 'estimate' CHECK (confidence_level IN ('literature','clinical','estimate','low')),
  sources          jsonb NOT NULL DEFAULT '[]',
  notes            text DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (substance_id, target_id, measure_type, effect_type)
);
CREATE INDEX IF NOT EXISTS idx_sta_substance ON public.substance_target_affinity (substance_id);
CREATE INDEX IF NOT EXISTS idx_sta_target ON public.substance_target_affinity (target_id);

-- 3) pharmacokinetics_routes
CREATE TABLE IF NOT EXISTS public.pharmacokinetics_routes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_id        uuid NOT NULL REFERENCES public.substances(id) ON DELETE CASCADE,
  route               text NOT NULL CHECK (route IN ('oral','nasal','iv','smoked','sublingual')),
  onset_min           integer,
  onset_max           integer,
  tmax_min            integer,
  tmax_max            integer,
  duration_min        integer,
  duration_max        integer,
  half_life_h         numeric,
  bioavailability_f   numeric CHECK (bioavailability_f IS NULL OR (bioavailability_f >= 0 AND bioavailability_f <= 1)),
  ka_h                numeric,
  ke_h                numeric,
  cmax_rel            numeric,
  after_effects_min   integer,
  after_effects_max   integer,
  confidence_level    text NOT NULL DEFAULT 'estimate' CHECK (confidence_level IN ('literature','clinical','estimate','low')),
  sources             jsonb NOT NULL DEFAULT '[]',
  notes               text DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (substance_id, route)
);
CREATE INDEX IF NOT EXISTS idx_pkroutes_substance ON public.pharmacokinetics_routes (substance_id);

-- 4) pharmacodynamics
CREATE TABLE IF NOT EXISTS public.pharmacodynamics (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_id              uuid NOT NULL REFERENCES public.substances(id) ON DELETE CASCADE,
  route                     text,
  emax                      numeric NOT NULL DEFAULT 100 CHECK (emax > 0),
  ec50_mg                   numeric,
  ec50_rel_concentration    numeric,
  hill_h                    numeric NOT NULL DEFAULT 1 CHECK (hill_h > 0),
  baseline_e0               numeric NOT NULL DEFAULT 0,
  therapeutic_index         numeric,
  tolerance_shift_per_day   numeric,
  confidence_level          text NOT NULL DEFAULT 'estimate' CHECK (confidence_level IN ('literature','clinical','estimate','low')),
  sources                   jsonb NOT NULL DEFAULT '[]',
  notes                     text DEFAULT '',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pd_substance ON public.pharmacodynamics (substance_id);

-- RLS
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substance_target_affinity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacokinetics_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacodynamics ENABLE ROW LEVEL SECURITY;

CREATE POLICY targets_select ON public.targets FOR SELECT USING (true);
CREATE POLICY targets_all ON public.targets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY sta_select ON public.substance_target_affinity FOR SELECT USING (true);
CREATE POLICY sta_all ON public.substance_target_affinity FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY pk_select ON public.pharmacokinetics_routes FOR SELECT USING (true);
CREATE POLICY pk_all ON public.pharmacokinetics_routes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY pd_select ON public.pharmacodynamics FOR SELECT USING (true);
CREATE POLICY pd_all ON public.pharmacodynamics FOR ALL USING (true) WITH CHECK (true);
