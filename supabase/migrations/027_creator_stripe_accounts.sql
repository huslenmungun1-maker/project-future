-- ============================================================
--  Enkhverse — Creator Stripe Connect accounts
-- ============================================================

create table if not exists public.creator_stripe_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  onboarding_status text not null default 'pending'
                      check (onboarding_status in ('pending', 'complete')),
  payouts_enabled   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint creator_stripe_accounts_user_id_unique unique (user_id)
);

create index if not exists idx_creator_stripe_accounts_user_id
  on public.creator_stripe_accounts(user_id);

alter table public.creator_stripe_accounts enable row level security;

-- Creators can read their own record
create policy "creator_stripe_accounts_self_read"
  on public.creator_stripe_accounts for select
  using (auth.uid() = user_id);

-- All writes go through service-role API routes (bypasses RLS)
