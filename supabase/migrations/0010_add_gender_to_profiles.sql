-- =============================================================================
-- Add a `gender` column to `public.profiles` so the UI can pick the right
-- Russian pronoun / verb form (e.g. "Теперь она точно знает" instead of
-- "Теперь он точно знает" when Maxim writes to Vika). The default
-- 'unspecified' keeps existing rows valid without forcing the couple to
-- revisit onboarding; UI falls back to masculine ("он") in that case.
-- =============================================================================

alter table public.profiles
  add column if not exists gender text not null default 'unspecified'
    check (gender in ('male', 'female', 'unspecified'));

-- Backfill the demo couple so the production widget shows correct grammar
-- immediately after this migration runs. Idempotent — re-running the
-- statement keeps the same value.
update public.profiles p
   set gender = case
     when u.email = 'maksiakimov123@gmail.com' then 'male'
     when u.email = 'davydovav444@gmail.com'  then 'female'
     else p.gender
   end
  from auth.users u
 where p.id = u.id
   and u.email in ('maksiakimov123@gmail.com', 'davydovav444@gmail.com');
