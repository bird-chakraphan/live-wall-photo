-- Supabase Realtime's postgres_changes broadcasts are gated by RLS on the
-- *new* row. For submissions, a transition to status='skipped' fails
-- submissions_select_display (status in ('approved','played')), so the
-- UPDATE is silently dropped and the display page never re-fetches (#12).
-- For events, broadcasting postgres_changes requires RLS access to the
-- whole row, which leaks internal columns (account_id, omise_charge_id,
-- paid_at, live_expires_at, ...) to anyone inspecting the display's
-- websocket (#17).
--
-- Switch both to Realtime Broadcast: triggers send small, intentional
-- payloads to a per-event topic. Clients re-run their existing RLS-safe
-- queries (loadPosts / event_public) on receipt instead of relying on the
-- raw row payload.

-- Submissions: ping only, no row data. Display re-runs loadPosts(), which
-- is already scoped by submissions_select_display.
create or replace function public.broadcast_submission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(
    jsonb_build_object('type', 'submissions_changed'),
    'submissions_changed',
    'event-' || coalesce(new.event_id, old.event_id)::text,
    false
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists submissions_broadcast_change on submissions;
create trigger submissions_broadcast_change
  after insert or update or delete on submissions
  for each row execute function public.broadcast_submission_change();

-- Events: broadcast only the two fields the display needs (status, paused),
-- not the full row.
create or replace function public.broadcast_event_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status, new.paused) is distinct from (old.status, old.paused) then
    perform realtime.send(
      jsonb_build_object('status', new.status, 'paused', new.paused),
      'event_status_changed',
      'event-' || new.id::text,
      false
    );
  end if;
  return new;
end;
$$;

drop trigger if exists events_broadcast_status_change on events;
create trigger events_broadcast_status_change
  after update on events
  for each row execute function public.broadcast_event_status_change();

-- No longer needed: the display page no longer subscribes to events
-- postgres_changes, and event_public() (SECURITY DEFINER) already covers
-- the direct read. Dropping this closes the full-row-leak in #17.
drop policy if exists "events_select_active_public" on events;
