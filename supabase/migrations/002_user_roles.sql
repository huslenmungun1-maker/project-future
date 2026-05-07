-- ============================================================
--  Enkhverse — User roles / profiles system
--  Run this in the Supabase SQL editor (Dashboard → SQL Editor)
--
--  Safe to run whether profiles table already exists or not.
--  Handles existing tables that use 'user_id' instead of 'id'.
-- ============================================================


-- ─────────────────────────────────────────
--  0. Normalise existing profiles table
--     If the table already exists with a
--     'user_id' PK, rename it to 'id' so
--     all subsequent steps are consistent.
-- ─────────────────────────────────────────

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'profiles'
      and column_name  = 'user_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'profiles'
      and column_name  = 'id'
  ) then
    alter table public.profiles rename column user_id to id;
  end if;
end;
$$;


-- ─────────────────────────────────────────
--  1. Create profiles table (fresh install)
--     Skipped automatically if it already
--     exists (the DO block above fixed it).
-- ─────────────────────────────────────────

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'reader'
                 check (role in ('reader', 'creator', 'owner')),
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Add any columns that may be missing from an existing table
alter table public.profiles add column if not exists role         text not null default 'reader';
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url   text;
alter table public.profiles add column if not exists created_at   timestamptz not null default now();
alter table public.profiles add column if not exists updated_at   timestamptz not null default now();

-- Add role constraint (safe to re-run)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add  constraint profiles_role_check
  check (role in ('reader', 'creator', 'owner'));

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ─────────────────────────────────────────
--  2. Auto-create profile on signup
-- ─────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'reader')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────
--  3. Backfill profiles for existing users
-- ─────────────────────────────────────────

insert into public.profiles (id, role)
select id, 'reader'
from auth.users
on conflict (id) do nothing;


-- ─────────────────────────────────────────
--  4. Row-Level Security on profiles
-- ─────────────────────────────────────────

alter table public.profiles enable row level security;

-- Drop existing policies so we can re-create them cleanly
drop policy if exists "profiles_public_read"        on public.profiles;
drop policy if exists "profiles_self_update"        on public.profiles;
drop policy if exists "profiles_owner_update_any"   on public.profiles;

-- Everyone can read all profiles
create policy "profiles_public_read"
  on public.profiles for select
  using (true);

-- Users can update their own profile but cannot change their role
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- Owners can update any profile (including role changes)
create policy "profiles_owner_update_any"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'owner'
    )
  );


-- ─────────────────────────────────────────
--  5. Update creator_applications RLS
--     to allow owners to read/update all
-- ─────────────────────────────────────────

drop policy if exists "Users can view own application"      on public.creator_applications;
drop policy if exists "Owners can update any application"   on public.creator_applications;

create policy "Users can view own application"
  on public.creator_applications for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'owner'
    )
  );

create policy "Owners can update any application"
  on public.creator_applications for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'owner'
    )
  );


-- ─────────────────────────────────────────
--  6. Set the owner's role
--     Uncomment and replace the email, then
--     run this block once in the SQL editor.
-- ─────────────────────────────────────────

update public.profiles
set role = 'owner'
where id = (
  select id from auth.users
  where email = 'huslen.mungun1@gmail.com'
  limit 1
);


-- ─────────────────────────────────────────
--  7. Indexes
-- ─────────────────────────────────────────

create index if not exists idx_profiles_role on public.profiles(role);
