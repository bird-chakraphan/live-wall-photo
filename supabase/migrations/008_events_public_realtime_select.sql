-- Supabase Realtime applies a table's RLS policies to decide who receives
-- postgres_changes broadcasts. events only had events_select_own
-- (account_id = auth.uid()), which anon never satisfies — so the display
-- page's subscription to events UPDATEs (paused, status, etc.) was always
-- silently dropped. Add a public policy for active events, mirroring what
-- event_public() already exposes via RPC.
create policy "events_select_active_public" on events for select
  using (status in ('active_ready', 'active_live'));
