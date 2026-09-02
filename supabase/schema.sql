-- FocusRoom session history table.
--
-- Auth model: users authenticate via Privy, not Supabase Auth, so there is
-- no `auth.uid()` to key RLS off of. Instead, the Python backend is the
-- ONLY thing that ever talks to Supabase (using the service role key,
-- which bypasses RLS by design), and it only does so after verifying the
-- caller's Privy access token itself (see backend/app/auth.py). RLS below
-- is set to deny all access to the anon/authenticated roles as
-- defense-in-depth — the Next.js dashboard never holds Supabase
-- credentials at all, it calls the Python backend's REST routes instead.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  user_id text not null,
  room_id text not null,
  started_at timestamptz not null,
  duration_seconds integer not null default 0,
  posture_nudge_count integer not null default 0,
  focus_nudge_count integer not null default 0,
  break_reminder_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_started_at_idx
  on public.sessions (user_id, started_at desc);

alter table public.sessions enable row level security;

-- No policies are created for anon/authenticated — this table is reachable
-- only via the service role key held by the Python backend.
