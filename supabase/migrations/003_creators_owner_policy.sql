-- ============================================================
--  Enkhverse — Allow owners to approve creator applications
--  Run in Supabase SQL editor after 001 and 002 migrations.
-- ============================================================

-- Replace the service-role-only insert policy with one that
-- also lets owners insert (needed when approving from /head).
drop policy if exists "Only service role inserts creators" on public.creators;

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
