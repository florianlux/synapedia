-- Chat session & message persistence for Safer-Use Companion
-- Privacy: no raw IPs stored, only HMAC-hashed ip_hash

create table if not exists public.chat_sessions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  user_id      uuid        null references auth.users(id) on delete set null,
  visitor_id   uuid        null,
  ip_hash      text        null,
  user_agent   text        null,
  title        text        null,
  risk_level   text        null,
  message_count int        not null default 0,
  consent_at   timestamptz null,
  retain_until timestamptz not null default (now() + interval '90 days')
);

create index if not exists idx_chat_sessions_user    on public.chat_sessions(user_id);
create index if not exists idx_chat_sessions_visitor on public.chat_sessions(visitor_id);
create index if not exists idx_chat_sessions_created on public.chat_sessions(created_at desc);
create index if not exists idx_chat_sessions_retain  on public.chat_sessions(retain_until);

create table if not exists public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid        not null references public.chat_sessions(id) on delete cascade,
  created_at   timestamptz not null default now(),
  role         text        not null check (role in ('user','assistant')),
  content      jsonb       not null default '{}'::jsonb,
  risk_level   text        null
);

create index if not exists idx_chat_messages_session on public.chat_messages(session_id, created_at);

-- RLS: only service_role can insert/read (admin API routes use service key)
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Allow service_role full access (admin API routes)
create policy "service_role_all_chat_sessions" on public.chat_sessions
  for all using (true) with check (true);
create policy "service_role_all_chat_messages" on public.chat_messages
  for all using (true) with check (true);
