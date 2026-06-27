create or replace function public.auth_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_couple_id is not null and target_couple_id = public.auth_couple_id()
$$;

alter table public.couples enable row level security;
alter table public.profiles enable row level security;
alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;
alter table public.love_reasons enable row level security;
alter table public.time_capsules enable row level security;
alter table public.time_capsule_photos enable row level security;
alter table public.love_counters enable row level security;
alter table public.counter_history enable row level security;
alter table public.secret_messages enable row level security;

-- Policy "couples_select_own": Users can read only their own couple.
create policy "couples_select_own" on public.couples for select using (id = public.auth_couple_id() or created_by = auth.uid());
-- Policy "couples_insert_self": Authenticated users can create a couple for themselves.
create policy "couples_insert_self" on public.couples for insert with check (created_by = auth.uid());
-- Policy "couples_update_own": Members can update only their own couple.
create policy "couples_update_own" on public.couples for update using (id = public.auth_couple_id()) with check (id = public.auth_couple_id());

create or replace function public.join_couple_by_invite(p_invite_code text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  target_couple public.couples;
  member_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into target_couple
  from public.couples
  where invite_code = p_invite_code;

  if target_couple.id is null then
    raise exception 'Invite code not found';
  end if;

  select count(*) into member_count
  from public.profiles
  where couple_id = target_couple.id;

  if member_count >= 2 then
    raise exception 'Couple already has two members';
  end if;

  update public.profiles
  set couple_id = target_couple.id
  where id = auth.uid()
    and couple_id is null;

  return target_couple;
end;
$$;

-- Policy "profiles_select_partner": Users can read their own profile and the partner profile in the same couple.
create policy "profiles_select_partner" on public.profiles for select using (id = auth.uid() or (couple_id is not null and couple_id = public.auth_couple_id()));
-- Policy "profiles_update_self": Users can update only their own profile.
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- Policy "profiles_insert_self": A signed-in user can create only their own profile row.
create policy "profiles_insert_self" on public.profiles for insert with check (id = auth.uid());

-- Policy "memories_select_own_couple": Memories are visible only inside the current user couple.
create policy "memories_select_own_couple" on public.memories for select using (public.is_couple_member(couple_id));
-- Policy "memories_insert_own_couple": New memories must belong to the current user couple.
create policy "memories_insert_own_couple" on public.memories for insert with check (public.is_couple_member(couple_id) and author_id = auth.uid());
-- Policy "memories_update_own_couple": Members can update memories only in their couple.
create policy "memories_update_own_couple" on public.memories for update using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
-- Policy "memories_delete_own_couple": Members can delete memories only in their couple.
create policy "memories_delete_own_couple" on public.memories for delete using (public.is_couple_member(couple_id));

-- Policy "memory_photos_select_own_couple": Memory photos are scoped by the denormalized couple_id.
create policy "memory_photos_select_own_couple" on public.memory_photos for select using (public.is_couple_member(couple_id));
-- Policy "memory_photos_write_own_couple": Photo metadata writes must stay inside the current couple.
create policy "memory_photos_write_own_couple" on public.memory_photos for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

-- Policy "love_reasons_select_own_couple": Reasons are visible only to the owning couple.
create policy "love_reasons_select_own_couple" on public.love_reasons for select using (public.is_couple_member(couple_id));
-- Policy "love_reasons_insert_own_couple": Reasons must be authored by the current user inside their couple.
create policy "love_reasons_insert_own_couple" on public.love_reasons for insert with check (public.is_couple_member(couple_id) and author_id = auth.uid());
-- Policy "love_reasons_update_own_couple": Members can update only reasons in their couple.
create policy "love_reasons_update_own_couple" on public.love_reasons for update using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
-- Policy "love_reasons_delete_own_couple": Members can delete only reasons in their couple.
create policy "love_reasons_delete_own_couple" on public.love_reasons for delete using (public.is_couple_member(couple_id));

-- Policy "time_capsules_select_own_couple": Rows are scoped to the couple; body masking is enforced by time_capsules_safe and server actions.
create policy "time_capsules_select_own_couple" on public.time_capsules for select using (public.is_couple_member(couple_id));
-- Policy "time_capsules_insert_own_couple": Capsules must be created by a member of the current couple.
create policy "time_capsules_insert_own_couple" on public.time_capsules for insert with check (public.is_couple_member(couple_id) and author_id = auth.uid());
-- Policy "time_capsules_update_own_couple": Capsules can be opened or edited only by their couple.
create policy "time_capsules_update_own_couple" on public.time_capsules for update using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
-- Policy "time_capsules_delete_own_couple": Capsules can be deleted only by their couple.
create policy "time_capsules_delete_own_couple" on public.time_capsules for delete using (public.is_couple_member(couple_id));

-- Policy "time_capsule_photos_opened_select": Capsule photos are readable only after the capsule open_at timestamp.
create policy "time_capsule_photos_opened_select" on public.time_capsule_photos for select using (
  public.is_couple_member(couple_id)
  and exists (select 1 from public.time_capsules c where c.id = capsule_id and now() >= c.open_at)
);
-- Policy "time_capsule_photos_write_own_couple": Capsule photo metadata can be written only by the owning couple.
create policy "time_capsule_photos_write_own_couple" on public.time_capsule_photos for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

-- Policy "love_counters_select_own_couple": Counters are visible only inside the current user couple.
create policy "love_counters_select_own_couple" on public.love_counters for select using (public.is_couple_member(couple_id));
-- Policy "love_counters_write_own_couple": Counter writes are limited to the current user couple.
create policy "love_counters_write_own_couple" on public.love_counters for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

-- Policy "counter_history_select_own_couple": Counter history is visible only inside the current user couple.
create policy "counter_history_select_own_couple" on public.counter_history for select using (public.is_couple_member(couple_id));
-- Policy "counter_history_insert_own_couple": History rows can be inserted only for the current couple by the current user.
create policy "counter_history_insert_own_couple" on public.counter_history for insert with check (public.is_couple_member(couple_id) and changed_by = auth.uid());

-- Policy "secret_messages_select_own_couple": Messages are visible only inside the current user couple; body masking is handled by secret_messages_safe and server actions.
create policy "secret_messages_select_own_couple" on public.secret_messages for select using (public.is_couple_member(couple_id));
-- Policy "secret_messages_insert_own_couple": Messages must be sent by the current user inside their couple.
create policy "secret_messages_insert_own_couple" on public.secret_messages for insert with check (public.is_couple_member(couple_id) and sender_id = auth.uid());
-- Policy "secret_messages_update_recipient": Only the recipient can mark a message as read, and only inside the couple.
create policy "secret_messages_update_recipient" on public.secret_messages for update using (public.is_couple_member(couple_id) and recipient_id = auth.uid()) with check (public.is_couple_member(couple_id));

create or replace view public.time_capsules_safe
with (security_invoker = true)
as
select
  id,
  couple_id,
  author_id,
  title,
  case when now() >= open_at then body else null end as body,
  open_at,
  is_opened,
  opened_at,
  created_at,
  updated_at,
  now() >= open_at as can_open
from public.time_capsules;

create or replace view public.secret_messages_safe
with (security_invoker = true)
as
select
  id,
  couple_id,
  sender_id,
  recipient_id,
  case when reveal_at is null or now() >= reveal_at then body else null end as body,
  reveal_at,
  is_read,
  read_at,
  created_at,
  (reveal_at is null or now() >= reveal_at) as is_revealed
from public.secret_messages;
