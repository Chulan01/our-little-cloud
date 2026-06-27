-- =============================================================================
-- Seed demo couple for Максим + Вика.
-- =============================================================================
-- Run AFTER both users signed up via /login (magic link).
-- Example:
--   SELECT public.seed_demo('max@example.com', 'vika@example.com');
--
-- The function is idempotent — running it twice won't create duplicates.
-- If the couple "Наше Облачко" already exists, it will be reused and only the
-- profiles / missing demo data will be added.
-- =============================================================================

create or replace function public.seed_demo(p_max_email text, p_vika_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  max_id  uuid;
  vika_id uuid;
  v_couple_id uuid;
begin
  select id into max_id  from auth.users where lower(email) = lower(p_max_email);
  select id into vika_id from auth.users where lower(email) = lower(p_vika_email);

  if max_id is null then
    raise exception 'User with email "%" not found. Sign up via /login first.', p_max_email;
  end if;
  if vika_id is null then
    raise exception 'User with email "%" not found. Sign up via /login first.', p_vika_email;
  end if;
  if max_id = vika_id then
    raise exception 'Both emails resolved to the same auth user. Use two distinct accounts.';
  end if;

  -- Reuse the couple if it already exists.
  select id into v_couple_id from public.couples where name = 'Наше Облачко' limit 1;
  if v_couple_id is null then
    v_couple_id := gen_random_uuid();
    insert into public.couples (id, name, anniversary_date, invite_code, created_by)
    values (v_couple_id, 'Наше Облачко', '2026-06-08', 'OUR-CLOUD-2026', max_id);
  end if;

  -- Bind both profiles.
  insert into public.profiles (id, couple_id, display_name)
    values (max_id, v_couple_id, 'максимка')
    on conflict (id) do update
      set couple_id    = excluded.couple_id,
          display_name = excluded.display_name;
  insert into public.profiles (id, couple_id, display_name)
    values (vika_id, v_couple_id, 'вика')
    on conflict (id) do update
      set couple_id    = excluded.couple_id,
          display_name = excluded.display_name;

  -- Seed memories (idempotent by title).
  if not exists (select 1 from public.memories where couple_id = v_couple_id and title = 'Знакомство') then
    insert into public.memories (couple_id, author_id, memory_date, title, body)
      values (v_couple_id, max_id, '2026-04-29',
              'Знакомство',
              'Тогда я даже не догадывался, что этот день станет судьбоносным.');
  end if;

  -- Seed counter (idempotent by label).
  if not exists (select 1 from public.love_counters where couple_id = v_couple_id and label = 'Прогулок под дождем') then
    insert into public.love_counters (couple_id, label, emoji, value, is_auto)
      values (v_couple_id, 'Прогулок под дождем', '☂', 1, false);
  end if;

  -- Seed secret message (idempotent by body+sender).
  if not exists (
    select 1 from public.secret_messages
    where couple_id = v_couple_id
      and sender_id  = max_id
      and body       = 'Я люблю тебя'
  ) then
    insert into public.secret_messages (couple_id, sender_id, recipient_id, body, is_read, read_at, is_revealed)
      values (v_couple_id, max_id, vika_id, 'Я люблю тебя', true, now(), true);
  end if;

  return v_couple_id;
end;
$$;

comment on function public.seed_demo(text, text) is
  'Идемпотентный seed для пары «Наше Облачко». Возвращает couple_id.';
