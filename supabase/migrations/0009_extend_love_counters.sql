-- =============================================================================
-- Extend love_counters with `display_mode` + seed 3 romantic defaults.
-- Run AFTER seed_demo has bound both auth users (their emails) to a couple.
--
-- What it does:
--   1. Adds a `display_mode` text column (3 valid values) so the app can
--      distinguish auto-counter flavors: rolling day-count, infinity, or
--      manual numeric.
--   2. Adds a UNIQUE index on (couple_id, label) so the seeder can upsert
--      idempotently against the user's possibly-edited counter labels.
--   3. Defines `public.seed_romantic_counters(p_max_email text, p_vika_email text)`
--      that resolves the couple, then upserts the 3 romance counters
--      (Дни вместе ☁, Любовь ∞, Поцелуев 💋) with appropriate display_mode
--      and is_auto=true. Re-running is a no-op update.
--
-- Usage (Supabase SQL Editor):
--   SELECT public.seed_romantic_counters('maksiakimov123@gmail.com', 'davydovav444@gmail.com');
--   -- Returns the total number of rows whose labels are the 3 romantic
--   --   defaults (always 3 after first run).
-- =============================================================================

alter table public.love_counters
  add column if not exists display_mode text not null default 'normal'
    check (display_mode in ('normal', 'days_since_anniversary', 'infinity'));

create unique index if not exists love_counters_couple_id_label_uidx
  on public.love_counters(couple_id, label);

create or replace function public.seed_romantic_counters(p_max_email text, p_vika_email text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  max_id      uuid;
  vika_id     uuid;
  max_couple  uuid;
  vika_couple uuid;
  inserted    integer := 0;
begin
  select id into max_id  from auth.users where lower(email) = lower(p_max_email);
  select id into vika_id from auth.users where lower(email) = lower(p_vika_email);

  if max_id is null or vika_id is null then
    raise exception 'Auth user(s) not found. Sign up at /login first.';
  end if;

  select couple_id into max_couple  from public.profiles where id = max_id;
  select couple_id into vika_couple from public.profiles where id = vika_id;

  if max_couple is null or vika_couple is null then
    raise exception 'Both profiles must be bound to a couple. Run public.seed_demo(...) first.';
  end if;
  if max_couple <> vika_couple then
    raise exception 'Maxim (couple=%) and Vika (couple=%) resolve to different couples — re-run public.seed_demo(...).', max_couple, vika_couple;
  end if;

  insert into public.love_counters (couple_id, label, emoji, value, is_auto, display_mode)
    values (max_couple, 'Дни вместе', '☁', 0, true, 'days_since_anniversary')
    on conflict (couple_id, label) do update set
      display_mode = excluded.display_mode,
      is_auto      = true;

  insert into public.love_counters (couple_id, label, emoji, value, is_auto, display_mode)
    values (max_couple, 'Любовь', '∞', 0, true, 'infinity')
    on conflict (couple_id, label) do update set
      display_mode = excluded.display_mode,
      is_auto      = true;

  insert into public.love_counters (couple_id, label, emoji, value, is_auto, display_mode)
    values (max_couple, 'Поцелуев', '💋', 0, true, 'infinity')
    on conflict (couple_id, label) do update set
      display_mode = excluded.display_mode,
      is_auto      = true;

  select count(*) into inserted
    from public.love_counters
    where couple_id = max_couple
      and label in ('Дни вместе', 'Любовь', 'Поцелуев');

  return inserted;
end;
$$;

comment on function public.seed_romantic_counters(text, text) is
  'Idempotently seeds the 3 romantic default counters (Дни вместе ☁, Любовь ∞, Поцелуев ∞) for the given couple. Always returns 3 after first run.';
