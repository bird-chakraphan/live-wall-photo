-- Track when an event's status last changed, so the dashboard can sort
-- "most recently became Ready/Live/etc." independently of unrelated edits
-- (which already bump updated_at).

alter table events add column status_changed_at timestamptz not null default now();

-- Backfill existing rows: best guess is their creation time.
update events set status_changed_at = created_at;

create or replace function set_status_changed_at() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  return new;
end $$;

create trigger events_status_changed_at before update on events
  for each row execute function set_status_changed_at();
