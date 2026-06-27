-- Hugs: soft "I miss you" + "hug back" signals inside a couple.
-- One row at a time per (sender, recipient) where status='missing';
-- the recipient flips status to 'hugged' (sets hugged_at) and the original
-- sender can later mark it seen (sender_seen_at) once they view the partner's reaction.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'hug_signal_status') then
    create type public.hug_signal_status as enum ('missing', 'hugged');
  end if;
end$$;

create table public.hug_signals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status public.hug_signal_status not null default 'missing',
  created_at timestamptz not null default now(),
  hugged_at timestamptz,
  sender_seen_at timestamptz
);

create index hug_signals_couple_id_idx on public.hug_signals(couple_id);
create index hug_signals_couple_id_created_at_idx on public.hug_signals(couple_id, created_at desc);
create index hug_signals_active_pair_idx on public.hug_signals(sender_id, recipient_id, status);

alter table public.hug_signals enable row level security;

-- Members of the couple can see all signals inside it.
create policy "hug_signals_select_own_couple" on public.hug_signals
  for select using (public.is_couple_member(couple_id));

-- Only the sender can create a new "missing" signal inside their couple.
create policy "hug_signals_insert_own_couple" on public.hug_signals
  for insert with check (
    public.is_couple_member(couple_id)
    and sender_id = auth.uid()
    and sender_id <> recipient_id
  );

-- Recipient flips status='missing' -> 'hugged' (also sets hugged_at).
-- Sender clears sender_seen_at after viewing the reaction.
create policy "hug_signals_update_own_couple" on public.hug_signals
  for update
  using (
    public.is_couple_member(couple_id)
    and (recipient_id = auth.uid() or sender_id = auth.uid())
  )
  with check (
    public.is_couple_member(couple_id)
    and (recipient_id = auth.uid() or sender_id = auth.uid())
  );

-- Either party in the couple can delete the signal (rare; cleanup path).
create policy "hug_signals_delete_own_couple" on public.hug_signals
  for delete using (
    public.is_couple_member(couple_id)
    and (sender_id = auth.uid() or recipient_id = auth.uid())
  );
