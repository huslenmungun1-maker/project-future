-- ============================================================
--  Migration 010: Fix owner RLS policies that used profiles.id
--  instead of profiles.user_id (live DB column name).
--  Patches policies from migrations 002, 003, 005, and 007.
-- ============================================================

-- ─── 002: profiles self-update policy ───────────────────────
drop policy if exists "profiles_self_update"      on public.profiles;
drop policy if exists "profiles_owner_update_any" on public.profiles;
drop policy if exists "profiles_self_read"        on public.profiles;

create policy "profiles_self_read"
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and role = (select role from public.profiles where user_id = auth.uid())
  );

create policy "profiles_owner_update_any"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ─── 002: creator_applications owner policies ───────────────
drop policy if exists "Users can view own application"    on public.creator_applications;
drop policy if exists "Owners can update any application" on public.creator_applications;

create policy "Users can view own application"
  on public.creator_applications for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

create policy "Owners can update any application"
  on public.creator_applications for update
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ─── 003: creators owner policies ───────────────────────────
drop policy if exists "Owners can insert creators" on public.creators;
drop policy if exists "Owners can update creators" on public.creators;

create policy "Owners can insert creators"
  on public.creators for insert
  with check (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

create policy "Owners can update creators"
  on public.creators for update
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ─── 007: platform_earnings owner read ──────────────────────
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'platform_earnings') then
    drop policy if exists "platform_earnings_owner_read" on public.platform_earnings;
    execute $pol$
      create policy "platform_earnings_owner_read" on public.platform_earnings
        for select
        using (
          exists (
            select 1 from public.profiles
            where user_id = auth.uid() and role = 'owner'
          )
        )
    $pol$;
  end if;
end $$;
