-- ============================================================
--  Enkhverse — Payout requests + debit_wallet function
-- ============================================================

-- ─────────────────────────────────────────
--  1. payout_requests
-- ─────────────────────────────────────────

create table if not exists public.payout_requests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  amount             numeric(12,2) not null check (amount > 0),
  status             text not null default 'pending'
                       check (status in ('pending', 'processing', 'paid', 'failed')),
  stripe_transfer_id text,
  failure_reason     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_payout_requests_user_id
  on public.payout_requests(user_id);

alter table public.payout_requests enable row level security;

create policy "payout_requests_self_read"
  on public.payout_requests for select
  using (auth.uid() = user_id);

-- All writes go through service-role API routes (bypasses RLS)


-- ─────────────────────────────────────────
--  2. debit_wallet function
--     Atomic: debit balance + log transaction.
--     Returns {ok: false, error: "..."} on failure.
-- ─────────────────────────────────────────

create or replace function public.debit_wallet(
  p_user_id     uuid,
  p_amount      numeric,
  p_description text default 'Payout'
)
returns jsonb language plpgsql security definer as $$
declare
  v_wallet_id uuid;
  v_balance   numeric(12,2);
begin
  select id, balance
  into v_wallet_id, v_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_wallet');
  end if;

  if v_balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  end if;

  update public.wallets
  set balance = balance - p_amount
  where id = v_wallet_id;

  insert into public.transactions (wallet_id, type, amount, description)
  values (v_wallet_id, 'debit', p_amount, p_description);

  return jsonb_build_object('ok', true);
end;
$$;
