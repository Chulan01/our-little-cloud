create extension if not exists pgcrypto;

create or replace function public.moment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  anniversary_date date,
  invite_code text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete set null,
  display_name text not null default 'Мое облачко' check (char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  memory_date date not null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  storage_path text not null,
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.love_reasons (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  number int not null check (number > 0 and number <= 365),
  text text not null check (char_length(text) between 1 and 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, number)
);

create table public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) <= 5000),
  open_at timestamptz not null,
  is_opened boolean not null default false,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.time_capsule_photos (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references public.time_capsules(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  storage_path text not null,
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.love_counters (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  emoji text,
  value bigint not null default 0 check (value >= 0),
  is_auto boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.counter_history (
  id uuid primary key default gen_random_uuid(),
  counter_id uuid not null references public.love_counters(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  changed_by uuid not null references auth.users(id) on delete cascade,
  delta bigint not null,
  new_value bigint not null check (new_value >= 0),
  created_at timestamptz not null default now()
);

create table public.secret_messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  reveal_at timestamptz,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index profiles_couple_id_idx on public.profiles(couple_id);
create index couples_created_by_idx on public.couples(created_by);
create index memories_couple_id_date_idx on public.memories(couple_id, memory_date desc);
create index memory_photos_couple_id_idx on public.memory_photos(couple_id);
create index memory_photos_memory_id_position_idx on public.memory_photos(memory_id, position);
create index love_reasons_couple_id_number_idx on public.love_reasons(couple_id, number);
create index time_capsules_couple_id_open_at_idx on public.time_capsules(couple_id, open_at);
create index time_capsule_photos_couple_id_idx on public.time_capsule_photos(couple_id);
create index love_counters_couple_id_idx on public.love_counters(couple_id);
create index counter_history_couple_id_idx on public.counter_history(couple_id);
create index counter_history_counter_id_created_at_idx on public.counter_history(counter_id, created_at desc);
create index secret_messages_couple_id_created_at_idx on public.secret_messages(couple_id, created_at);
create index secret_messages_couple_id_reveal_at_idx on public.secret_messages(couple_id, reveal_at);

create trigger couples_updated_at before update on public.couples for each row execute function public.moment_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.moment_updated_at();
create trigger memories_updated_at before update on public.memories for each row execute function public.moment_updated_at();
create trigger love_reasons_updated_at before update on public.love_reasons for each row execute function public.moment_updated_at();
create trigger time_capsules_updated_at before update on public.time_capsules for each row execute function public.moment_updated_at();
create trigger love_counters_updated_at before update on public.love_counters for each row execute function public.moment_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Мое облачко'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
