-- WeddingTech initial schema
-- Run in Supabase SQL editor after creating the project.

create extension if not exists "pgcrypto";

-- ── Events ──────────────────────────────────────────────
create type event_status as enum ('draft', 'active_ready', 'active_live', 'ended');

create table events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled Event',
  event_date date,
  status event_status not null default 'draft',
  accent_color text not null default 'linear-gradient(135deg, #5CC9A7, #93DA8D)',
  display_font text not null default 'Prompt',
  post_duration_seconds int not null default 15 check (post_duration_seconds between 10 and 30),
  display_bg_url text,
  guest_bg_url text,
  logo_url text,
  paid_at timestamptz,
  live_started_at timestamptz,
  live_expires_at timestamptz,
  paused boolean not null default false,
  retention_until date,                  -- 60 days after event_date, auto-purge target (see 010_retention.sql)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_account_id_idx on events(account_id);
create index events_status_idx on events(status);

-- ── Submissions ─────────────────────────────────────────
create type submission_status as enum ('pending', 'approved', 'rejected', 'played', 'skipped');

create table submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  guest_name text not null check (char_length(guest_name) between 1 and 40),
  message text not null check (char_length(message) between 1 and 150),
  photo_url text not null,
  status submission_status not null default 'pending',
  approved_at timestamptz,               -- moderation pass time; +60s buffer before display
  played_at timestamptz,
  pinned boolean not null default false, -- "Pin Next"
  moderation_reason text,                -- internal log only; silent rejection to guest
  created_at timestamptz not null default now()
);

create index submissions_event_status_idx on submissions(event_id, status);
create index submissions_event_played_idx on submissions(event_id, played_at);

-- ── Updated-at trigger ──────────────────────────────────
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger events_updated_at before update on events
  for each row execute function set_updated_at();

-- ── RLS ─────────────────────────────────────────────────
alter table events enable row level security;
alter table submissions enable row level security;

-- Planners can CRUD their own events
create policy "events_select_own" on events for select using (account_id = auth.uid());
create policy "events_insert_own" on events for insert with check (account_id = auth.uid());
create policy "events_update_own" on events for update using (account_id = auth.uid());
create policy "events_delete_own" on events for delete using (account_id = auth.uid());

-- Public read of minimal event info for the guest-upload + display screens
-- (we expose a SECURITY DEFINER function below rather than a broad public policy.)

create or replace function public.event_public(p_id uuid)
returns table (
  id uuid, name text, event_date date, status event_status,
  accent_color text, display_font text, post_duration_seconds int,
  display_bg_url text, guest_bg_url text, logo_url text, paused boolean
) language sql security definer set search_path = public as $$
  select id, name, event_date, status, accent_color, display_font,
         post_duration_seconds, display_bg_url, guest_bg_url, logo_url, paused
    from events
   where id = p_id
     and status in ('active_ready', 'active_live');
$$;

grant execute on function public.event_public(uuid) to anon, authenticated;

-- Planners read submissions for their events
create policy "submissions_select_planner" on submissions for select
  using (exists (select 1 from events e where e.id = submissions.event_id and e.account_id = auth.uid()));

create policy "submissions_update_planner" on submissions for update
  using (exists (select 1 from events e where e.id = submissions.event_id and e.account_id = auth.uid()));

create policy "submissions_delete_planner" on submissions for delete
  using (exists (select 1 from events e where e.id = submissions.event_id and e.account_id = auth.uid()));

-- Guest submissions go through a SECURITY DEFINER RPC (validates event live, runs moderation).
-- No direct INSERT policy for the public.

-- Display screen needs to read approved submissions for any *active_live* event.
create policy "submissions_select_display" on submissions for select
  using (
    status in ('approved', 'played')
    and exists (select 1 from events e where e.id = submissions.event_id and e.status = 'active_live')
  );

-- ── Storage buckets ─────────────────────────────────────
insert into storage.buckets (id, name, public) values ('guest-photos', 'guest-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('event-branding', 'event-branding', true) on conflict (id) do nothing;

-- Guests upload via signed URLs created from the server; planners upload branding through their own session.
create policy "branding_planner_write" on storage.objects for insert
  to authenticated with check (bucket_id = 'event-branding');
create policy "branding_public_read" on storage.objects for select
  using (bucket_id in ('event-branding', 'guest-photos'));
