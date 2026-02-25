-- Seed: Pharmacology data for Psilocybin
-- Uses DO blocks so it can be run multiple times safely

DO $$
DECLARE
  psilocybin_id uuid;
  t_5ht2a uuid;
  t_5ht2b uuid;
  t_5ht2c uuid;
  t_5ht1a uuid;
  t_dat   uuid;
  t_net   uuid;
  t_sert  uuid;
  t_mglur5 uuid;
BEGIN
  -- Get psilocybin substance ID (look up by name)
  SELECT id INTO psilocybin_id
  FROM public.substances
  WHERE lower(name) LIKE '%psilocybin%'
  LIMIT 1;

  IF psilocybin_id IS NULL THEN
    RAISE NOTICE 'Psilocybin substance not found, skipping pharmacology seed.';
    RETURN;
  END IF;

  -- Insert targets
  INSERT INTO public.targets (slug, name, family, description)
  VALUES ('5-ht2a', '5-HT₂A', 'serotonin', 'Serotonin-2A-Rezeptor; primäres Ziel psychedelischer Wirkung')
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.targets (slug, name, family, description)
  VALUES ('5-ht2b', '5-HT₂B', 'serotonin', 'Serotonin-2B-Rezeptor; kardiovaskuläre Relevanz')
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.targets (slug, name, family, description)
  VALUES ('5-ht2c', '5-HT₂C', 'serotonin', 'Serotonin-2C-Rezeptor; Stimmungs- und Appetitregulation')
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.targets (slug, name, family, description)
  VALUES ('5-ht1a', '5-HT₁A', 'serotonin', 'Serotonin-1A-Rezeptor; Autoreceptor und anxiolytische Effekte')
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.targets (slug, name, family, description)
  VALUES ('dat', 'DAT', 'transporter', 'Dopamin-Transporter; verantwortlich für Dopamin-Wiederaufnahme')
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.targets (slug, name, family, description)
  VALUES ('net', 'NET', 'transporter', 'Noradrenalin-Transporter')
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.targets (slug, name, family, description)
  VALUES ('sert', 'SERT', 'transporter', 'Serotonin-Transporter; primäres Ziel von SSRIs')
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.targets (slug, name, family, description)
  VALUES ('mglur5', 'mGluR5', 'glutamate', 'Metabotroper Glutamatrezeptor 5; Interaktion mit 5-HT₂A')
  ON CONFLICT (slug) DO NOTHING;

  -- Fetch target IDs
  SELECT id INTO t_5ht2a FROM public.targets WHERE slug = '5-ht2a';
  SELECT id INTO t_5ht2b FROM public.targets WHERE slug = '5-ht2b';
  SELECT id INTO t_5ht2c FROM public.targets WHERE slug = '5-ht2c';
  SELECT id INTO t_5ht1a FROM public.targets WHERE slug = '5-ht1a';
  SELECT id INTO t_dat   FROM public.targets WHERE slug = 'dat';
  SELECT id INTO t_net   FROM public.targets WHERE slug = 'net';
  SELECT id INTO t_sert  FROM public.targets WHERE slug = 'sert';
  SELECT id INTO t_mglur5 FROM public.targets WHERE slug = 'mglur5';

  -- Insert affinities for psilocybin (as psilocin, the active metabolite)
  INSERT INTO public.substance_target_affinity
    (substance_id, target_id, measure_type, affinity_nm, effect_type, efficacy, confidence_level, notes)
  VALUES
    (psilocybin_id, t_5ht2a, 'Ki', 107, 'agonist', 75, 'literature',
     'Psilocin als aktiver Metabolit; Hauptwirkung über 5-HT₂A-Agonismus'),
    (psilocybin_id, t_5ht2b, 'Ki', 180, 'agonist', 60, 'literature', ''),
    (psilocybin_id, t_5ht2c, 'Ki', 130, 'agonist', 65, 'literature', ''),
    (psilocybin_id, t_5ht1a, 'Ki', 190, 'partial_agonist', 40, 'estimate', 'Schwache partielle Agonistenaktivität'),
    (psilocybin_id, t_sert,  'Ki', 4200, 'inhibitor', null, 'estimate', 'Sehr schwache SERT-Affinität'),
    (psilocybin_id, t_dat,   'Ki', 8900, 'inhibitor', null, 'low', 'Marginale Affinität'),
    (psilocybin_id, t_net,   'Ki', 6100, 'inhibitor', null, 'low', 'Marginale Affinität'),
    (psilocybin_id, t_mglur5,'qualitative', null, 'modulator', null, 'estimate',
     'Funktionelle Interaktion über 5-HT₂A/mGluR5-Heterodimer')
  ON CONFLICT (substance_id, target_id, measure_type, effect_type) DO NOTHING;

  -- PK routes
  INSERT INTO public.pharmacokinetics_routes
    (substance_id, route, onset_min, onset_max, tmax_min, tmax_max,
     duration_min, duration_max, half_life_h, bioavailability_f,
     after_effects_min, after_effects_max, confidence_level, notes)
  VALUES
    (psilocybin_id, 'oral', 20, 60, 80, 120, 180, 360, 2.5, 0.50,
     60, 120, 'literature',
     'Psilocybin wird rasch zu Psilocin dephosphoryliert (t½ ~80min für Psilocybin → Psilocin)'),
    (psilocybin_id, 'iv', 0, 5, 5, 15, 60, 120, 1.8, 1.0,
     30, 60, 'clinical',
     'Intravenöse Applikation in klinischen Studien (z.B. Carhart-Harris et al.)')
  ON CONFLICT (substance_id, route) DO NOTHING;

  -- PD params
  INSERT INTO public.pharmacodynamics
    (substance_id, route, emax, ec50_mg, ec50_rel_concentration, hill_h, baseline_e0,
     therapeutic_index, confidence_level, notes)
  VALUES
    (psilocybin_id, 'oral', 100, 25, 0.35, 1.8, 0, 10, 'estimate',
     'Emax-Hill-Modell für subjektive Intensität (oral). ED₅₀ ~25mg basierend auf klinischen Studien.'),
    (psilocybin_id, 'iv', 100, 8, 0.3, 2.0, 0, 15, 'clinical',
     'IV-Modell basierend auf Studie Carhart-Harris et al. 2016')
  ON CONFLICT DO NOTHING;

END $$;
