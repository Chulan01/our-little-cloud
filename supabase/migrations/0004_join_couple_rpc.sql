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
