-- Cache the active Omise charge's expiry so the settings page can show a
-- "pay within X" countdown without calling the Omise API on every load.

alter table events add column omise_charge_expires_at timestamptz;
