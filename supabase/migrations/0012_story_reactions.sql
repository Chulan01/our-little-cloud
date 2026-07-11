-- Reactions under each "Наша история" timeline entry.
--
-- Each event can hold one reaction per person (Максим / Вика). A reaction is
-- just a heart "kind" key rendered on the client. Both members of the couple
-- may add or change reactions (unlike the timeline itself, which is admin-only),
-- so writes are allowed for any couple member — scoped to their own couple.

create table if not exists public.story_reactions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  event_id uuid not null references public.story_events(id) on delete cascade,
  person text not null check (person in ('maxim', 'vika')),
  heart text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, person)
);

create index if not exists story_reactions_event_idx on public.story_reactions(event_id);
create index if not exists story_reactions_couple_idx on public.story_reactions(couple_id);

alter table public.story_reactions enable row level security;

-- Reading + writing: any member of the couple (both people react).
create policy "story_reactions_select_member" on public.story_reactions
  for select using (public.is_couple_member(couple_id));

create policy "story_reactions_insert_member" on public.story_reactions
  for insert with check (public.is_couple_member(couple_id));

create policy "story_reactions_update_member" on public.story_reactions
  for update using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

create policy "story_reactions_delete_member" on public.story_reactions
  for delete using (public.is_couple_member(couple_id));

-- updated_at maintenance (mirrors the pattern used by earlier tables).
drop trigger if exists story_reactions_touch on public.story_reactions;
create trigger story_reactions_touch before update on public.story_reactions
  for each row execute function public.touch_updated_at();
