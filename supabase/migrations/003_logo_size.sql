-- Lets organizers control how large the event logo appears on the live
-- wall screen (top-right corner).

alter table events add column logo_size text not null default 'M'
  check (logo_size in ('S', 'M', 'L'));

-- Expose logo_size via event_public so the display page can read it.
-- Return type is changing, so the old function must be dropped first.
drop function if exists public.event_public(uuid);

create or replace function public.event_public(p_id uuid)
returns table (
  id uuid, name text, event_date date, status event_status,
  accent_color text, display_font text, post_duration_seconds int,
  display_bg_url text, guest_bg_url text, logo_url text, logo_size text, paused boolean
) language sql security definer set search_path = public as $$
  select id, name, event_date, status, accent_color, display_font,
         post_duration_seconds, display_bg_url, guest_bg_url, logo_url, logo_size, paused
    from events
   where id = p_id
     and status in ('active_ready', 'active_live');
$$;

grant execute on function public.event_public(uuid) to anon, authenticated;
