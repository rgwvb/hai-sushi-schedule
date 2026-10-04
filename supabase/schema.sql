-- Taiwan Police Career Simulator - Supabase schema
-- Run this in Supabase SQL Editor after creating a project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_name text not null default 'main',
  version integer not null default 1,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slot_name)
);

create table if not exists public.career_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  title text not null,
  detail text,
  event_time timestamptz not null default now()
);

create table if not exists public.case_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_no text not null,
  case_type text not null,
  action text,
  result text,
  xp integer not null default 0,
  case_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_saves_user on public.game_saves(user_id);
create index if not exists idx_career_events_user_time on public.career_events(user_id, event_time desc);
create index if not exists idx_case_records_user_date on public.case_records(user_id, case_date desc);

alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
alter table public.career_events enable row level security;
alter table public.case_records enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "game saves own rows" on public.game_saves;
create policy "game saves own rows" on public.game_saves
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "career events own rows" on public.career_events;
create policy "career events own rows" on public.career_events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "case records own rows" on public.case_records;
create policy "case records own rows" on public.case_records
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_game_saves_updated on public.game_saves;
create trigger trg_game_saves_updated before update on public.game_saves
for each row execute procedure public.touch_updated_at();
