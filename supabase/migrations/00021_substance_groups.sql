-- Substance Groups
-- Table for grouping substances by pharmacological class

create table if not exists public.substance_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Public read-only access (consistent with existing RLS approach)
alter table public.substance_groups enable row level security;

create policy "Public read access for substance_groups"
  on public.substance_groups for select
  using (true);

-- Add group_id foreign key to substances table (if the table exists)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'substances'
  ) then
    -- Only add the column if it doesn't exist
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'substances' and column_name = 'group_id'
    ) then
      alter table public.substances
        add column group_id uuid references public.substance_groups(id) on delete set null;
      create index idx_substances_group_id on public.substances(group_id);
    end if;
  end if;
end $$;

-- Seed default groups
insert into public.substance_groups (name, slug, description, icon, sort_order) values
  ('Stimulanzien',               'stimulanzien',       'Substanzen, die die Aktivität des zentralen Nervensystems steigern und Wachheit, Aufmerksamkeit sowie Energie erhöhen.', '⚡', 1),
  ('Depressiva',                 'depressiva',         'Substanzen, die die Aktivität des ZNS dämpfen und sedierende, anxiolytische oder muskelrelaxierende Wirkungen haben.', '🌙', 2),
  ('Opioide',                    'opioide',            'Substanzen, die an Opioidrezeptoren binden und analgetische sowie euphorisierende Effekte hervorrufen.', '💊', 3),
  ('Psychedelika',               'psychedelika',       'Substanzen, die primär über serotonerge Rezeptoren wirken und tiefgreifende Veränderungen der Wahrnehmung und des Bewusstseins bewirken.', '🍄', 4),
  ('Dissoziativa',               'dissoziativa',       'Substanzen, die primär NMDA-Rezeptoren blockieren und dissoziative Zustände mit veränderter Wahrnehmung erzeugen.', '🔮', 5),
  ('Cannabinoide',               'cannabinoide',       'Substanzen, die auf das Endocannabinoidsystem wirken, primär über CB1- und CB2-Rezeptoren.', '🌿', 6),
  ('Empathogene / Entaktogene',  'empathogene',        'Substanzen, die die Freisetzung von Serotonin und anderen Monoaminen fördern und Empathie sowie emotionale Offenheit verstärken.', '💛', 7),
  ('Benzodiazepine',             'benzodiazepine',     'Positive allosterische Modulatoren am GABA-A-Rezeptor mit anxiolytischer, sedierender und antikonvulsiver Wirkung.', '💤', 8),
  ('Nootropika',                 'nootropika',         'Substanzen, die kognitive Funktionen wie Gedächtnis, Konzentration oder Lernfähigkeit verbessern sollen.', '🧠', 9),
  ('Deliranzien',                'deliranzien',        'Substanzen, die anticholinerg wirken und einen deliranten Zustand mit echten Halluzinationen hervorrufen können.', '👁️', 10),
  ('Research Chemicals / Designer', 'research-chemicals', 'Neuartige psychoaktive Substanzen, die oft als Derivate bekannter Wirkstoffe entwickelt werden und wenig erforscht sind.', '🧪', 11),
  ('Antidepressiva',             'antidepressiva',     'Medikamentenklassen, die zur Behandlung von Depressionen und Angststörungen eingesetzt werden.', '🩺', 12)
on conflict (slug) do nothing;
