-- Dating-spots map + "Наша история" timeline.
--
-- Both tables are readable by every couple member, but writes are restricted
-- to the single admin account (checked by JWT email) so only the site
-- keeper can place map pins and edit the timeline.

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'maksiakimov123@gmail.com'
$$;

create table if not exists public.date_spots (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  body text not null,
  lat double precision not null,
  lng double precision not null,
  spot_date date,
  photo_url text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  event_date date not null,
  title text not null,
  body text not null,
  emoji text,
  photo_url text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists date_spots_couple_idx on public.date_spots(couple_id);
create index if not exists story_events_couple_idx on public.story_events(couple_id, event_date);

alter table public.date_spots enable row level security;
alter table public.story_events enable row level security;

-- Reading: any member of the couple.
create policy "date_spots_select_member" on public.date_spots
  for select using (public.is_couple_member(couple_id));

create policy "story_events_select_member" on public.story_events
  for select using (public.is_couple_member(couple_id));

-- Writing: only the admin account, and only inside the own couple.
create policy "date_spots_insert_admin" on public.date_spots
  for insert with check (public.is_site_admin() and public.is_couple_member(couple_id));

create policy "date_spots_update_admin" on public.date_spots
  for update using (public.is_site_admin() and public.is_couple_member(couple_id))
  with check (public.is_site_admin() and public.is_couple_member(couple_id));

create policy "date_spots_delete_admin" on public.date_spots
  for delete using (public.is_site_admin() and public.is_couple_member(couple_id));

create policy "story_events_insert_admin" on public.story_events
  for insert with check (public.is_site_admin() and public.is_couple_member(couple_id));

create policy "story_events_update_admin" on public.story_events
  for update using (public.is_site_admin() and public.is_couple_member(couple_id))
  with check (public.is_site_admin() and public.is_couple_member(couple_id));

create policy "story_events_delete_admin" on public.story_events
  for delete using (public.is_site_admin() and public.is_couple_member(couple_id));

-- updated_at maintenance (mirrors the pattern used by earlier tables).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists date_spots_touch on public.date_spots;
create trigger date_spots_touch before update on public.date_spots
  for each row execute function public.touch_updated_at();

drop trigger if exists story_events_touch on public.story_events;
create trigger story_events_touch before update on public.story_events
  for each row execute function public.touch_updated_at();
