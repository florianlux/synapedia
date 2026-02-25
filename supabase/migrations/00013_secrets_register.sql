-- =============================================================
-- Migration: Secrets Register (metadata only)
-- =============================================================

-- Schema
create schema if not exists synapedia;

-- Admin allowlist (for RLS)
create table if not exists synapedia.admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

-- Secrets Register (metadata only – no secret values!)
create table synapedia.secrets_register (
  id uuid primary key default gen_random_uuid(),
  env text not null check (env in ('local','staging','production')),
  project text not null,
  name text not null,
  kind text not null check (kind in ('token','password','email','apikey','oauth','other')),
  used_by text,
  storage_location text not null,
  source_label text,
  source_url text,
  owner text,
  notes text,
  last_rotated_at timestamptz,
  rotate_every_days int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(env, project, name)
);

-- Auto-update updated_at on row change
create or replace function synapedia.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger secrets_register_updated_at
  before update on synapedia.secrets_register
  for each row execute function synapedia.set_updated_at();

-- RLS
alter table synapedia.secrets_register enable row level security;

create policy "admin_select" on synapedia.secrets_register
  for select using (
    (auth.jwt() ->> 'email') in (select email from synapedia.admins)
  );

create policy "admin_insert" on synapedia.secrets_register
  for insert with check (
    (auth.jwt() ->> 'email') in (select email from synapedia.admins)
  );

create policy "admin_update" on synapedia.secrets_register
  for update using (
    (auth.jwt() ->> 'email') in (select email from synapedia.admins)
  );

create policy "admin_delete" on synapedia.secrets_register
  for delete using (
    (auth.jwt() ->> 'email') in (select email from synapedia.admins)
  );
