-- Track the Omise charge for an event's activation payment, so the webhook
-- can find the event from `charge.complete` and confirm it server-side.

alter table events add column omise_charge_id text;
create index events_omise_charge_id_idx on events(omise_charge_id);
