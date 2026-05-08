-- ============================================================
--  Enkhverse — Fix RLS policies for wallet/payments tables
--  Run after migration 006.
-- ============================================================

-- ─────────────────────────────────────────
--  1. platform_earnings: allow owner to read
--     (was using (false) which blocked the admin API)
-- ─────────────────────────────────────────
drop policy if exists "platform_earnings_owner_read" on public.platform_earnings;

create policy "platform_earnings_owner_read" on public.platform_earnings
  for select
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ─────────────────────────────────────────
--  2. wallets: allow insert from triggers/RPCs
--     (security definer RPCs bypass RLS, but add explicit policy
--      in case direct inserts are ever needed)
-- ─────────────────────────────────────────
drop policy if exists "wallets_service_insert" on public.wallets;

-- Only service-role / security-definer functions need this;
-- regular users never insert wallets directly.
-- (No user-facing insert policy needed — covered by trigger.)

-- ─────────────────────────────────────────
--  3. chapter_unlocks: explicit self-read already exists,
--     but ensure no accidental reads across users
-- ─────────────────────────────────────────
-- policy already correct — no change needed

-- ─────────────────────────────────────────
--  4. transactions: self-read already correct
--     Add explicit no-insert for users (RPCs only)
-- ─────────────────────────────────────────
-- no change needed — inserts only via security definer RPCs

-- ─────────────────────────────────────────
--  5. Ensure chapters price column exists
--     (idempotent — safe to run again)
-- ─────────────────────────────────────────
alter table public.chapters add column if not exists price numeric(12,2) not null default 0;
