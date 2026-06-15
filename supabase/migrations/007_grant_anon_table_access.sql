-- RLS policies only restrict rows once a base table-level grant exists.
-- Without this, anon/authenticated queries against `submissions` fail
-- outright with "permission denied", regardless of RLS.
grant select on public.submissions to anon, authenticated;

-- submissions_select_display checked event status via a direct subquery on
-- `events`, but that subquery is itself subject to events' RLS
-- (events_select_own: account_id = auth.uid()), which is false for anon —
-- so the EXISTS always failed and the display page never saw any posts.
-- Use a SECURITY DEFINER helper (same pattern as event_public()) to check
-- event status without going through events' RLS.
create or replace function public.event_is_live(p_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from events where id = p_event_id and status = 'active_live');
$$;

grant execute on function public.event_is_live(uuid) to anon, authenticated;

drop policy "submissions_select_display" on submissions;
create policy "submissions_select_display" on submissions for select
  using (
    status in ('approved', 'played')
    and public.event_is_live(event_id)
  );
