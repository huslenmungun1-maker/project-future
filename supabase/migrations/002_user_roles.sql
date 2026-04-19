-- ============================================================
--  Enkhverse — User roles / profiles system
--  Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================


-- ─────────────────────────────────────────
--  1. profiles table
--     One row per auth.users row.
--     role: reader (default) | creator | owner
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

-- Everyone can read all profiles (for public creator pages)
create policy "profiles_public_read"
  on public.profiles for select
  using (true);

-- Users can update their own non-role fields only
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Users cannot change their own role (only owners can change roles)
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

-- Drop existing select policy and replace with owner-aware version
drop policy if exists "Users can view own application" on public.creator_applications;

create policy "Users can view own application"
  on public.creator_applications for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'owner'
    )
  );

-- Allow owners to update any application (for approve/reject in admin panel)
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
--     Replace the placeholder email below
--     with your actual owner email, then run
--     this block once in the SQL editor.
-- ─────────────────────────────────────────

-- UPDATE public.profiles
-- SET role = 'owner'
-- WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'your-owner-email@example.com' LIMIT 1
-- );

-- ─────────────────────────────────────────
--  7. Indexes
-- ─────────────────────────────────────────

create index if not exists idx_profiles_role on public.profiles(role);
