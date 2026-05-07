-- Fix: ensure authenticated users can always read their own profiles row.
-- The public-read policy from 002 may not have been applied on the live project.

alter table public.profiles enable row level security;

-- Drop and recreate to guarantee clean state
drop policy if exists "profiles_public_read"  on public.profiles;
drop policy if exists "profiles_self_read"    on public.profiles;

-- Any authenticated user can read any profile row (needed for role lookups,
-- follower counts, creator pages, etc.)
create policy "profiles_public_read"
  on public.profiles for select
  using (true);

-- Belt-and-suspenders: explicit self-read so the auth role check always works
create policy "profiles_self_read"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);
