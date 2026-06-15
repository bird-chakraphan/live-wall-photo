-- 60-day content retention.
--
-- `events.retention_until` is kept in sync with `event_date` (event_date +
-- 60 days) via trigger. A daily cron route (/api/cron/retention) deletes
-- submissions rows + their Storage objects for events past retention_until,
-- and marks the event row with `content_purged_at` (the event row itself is
-- kept for planner history).

alter table events add column if not exists content_purged_at timestamptz;

create or replace function set_retention_until() returns trigger language plpgsql as $$
begin
  if new.event_date is not null then
    new.retention_until := new.event_date + 60;
  end if;
  return new;
end $$;

drop trigger if exists events_set_retention_until on events;
create trigger events_set_retention_until
  before insert or update of event_date on events
  for each row execute function set_retention_until();

-- Backfill rows that already have an event_date but no retention_until.
update events set retention_until = event_date + 60
where event_date is not null and retention_until is null;
