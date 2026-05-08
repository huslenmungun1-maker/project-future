-- ============================================================
--  Enkhverse — Wallet & Payments
--  Run after migrations 001–005.
-- ============================================================

-- ─────────────────────────────────────────
--  1. wallets
-- ─────────────────────────────────────────
create table if not exists public.wallets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  balance    numeric(12,2) not null default 0,
  currency   text not null default 'USD',
  created_at timestamptz not null default now(),
  constraint wallets_user_id_unique unique (user_id),
  constraint wallets_balance_nonneg check (balance >= 0)
);

create index if not exists idx_wallets_user_id on public.wallets(user_id);

alter table public.wallets enable row level security;

create policy "wallets_self_read" on public.wallets
  for select using (auth.uid() = user_id);

create policy "wallets_self_update" on public.wallets
  for update using (auth.uid() = user_id);

-- ─────────────────────────────────────────
--  2. transactions
-- ─────────────────────────────────────────
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  wallet_id    uuid not null references public.wallets(id) on delete cascade,
  type         text not null check (type in ('credit','debit')),
  amount       numeric(12,2) not null check (amount > 0),
  description  text not null default '',
  status       text not null default 'completed' check (status in ('pending','completed','failed')),
  reference_id uuid,
  created_at   timestamptz not null default now()
);

create index if not exists idx_transactions_wallet_id on public.transactions(wallet_id);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);

alter table public.transactions enable row level security;

create policy "transactions_self_read" on public.transactions
  for select
  using (
    exists (
      select 1 from public.wallets w
      where w.id = wallet_id and w.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
--  3. platform_earnings  (15% cuts)
-- ─────────────────────────────────────────
create table if not exists public.platform_earnings (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id),
  amount         numeric(12,2) not null check (amount > 0),
  description    text not null default '',
  created_at     timestamptz not null default now()
);

alter table public.platform_earnings enable row level security;

-- Only owner can read platform earnings (via service role in API, policy blocks anon)
create policy "platform_earnings_owner_read" on public.platform_earnings
  for select using (false);

-- ─────────────────────────────────────────
--  4. chapter_unlocks
-- ─────────────────────────────────────────
create table if not exists public.chapter_unlocks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  paid_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint chapter_unlocks_unique unique (user_id, chapter_id)
);

create index if not exists idx_chapter_unlocks_user_id on public.chapter_unlocks(user_id);
create index if not exists idx_chapter_unlocks_chapter_id on public.chapter_unlocks(chapter_id);

alter table public.chapter_unlocks enable row level security;

create policy "chapter_unlocks_self_read" on public.chapter_unlocks
  for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────
--  5. Add price to chapters
-- ─────────────────────────────────────────
alter table public.chapters add column if not exists price numeric(12,2) not null default 0;

-- ─────────────────────────────────────────
--  6. Trigger: auto-create wallet on signup
-- ─────────────────────────────────────────
create or replace function public.create_wallet_for_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.wallets (user_id, balance, currency)
  values (new.id, 0, 'USD')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_wallet on auth.users;
create trigger trg_create_wallet
  after insert on auth.users
  for each row execute function public.create_wallet_for_new_user();

-- Backfill: give wallets to existing users who don't have one
insert into public.wallets (user_id, balance, currency)
select id, 0, 'USD'
from auth.users
where id not in (select user_id from public.wallets)
on conflict (user_id) do nothing;

-- ─────────────────────────────────────────
--  7. Function: unlock_chapter  (atomic)
-- ─────────────────────────────────────────
create or replace function public.unlock_chapter(
  p_reader_id  uuid,
  p_chapter_id uuid
)
returns jsonb language plpgsql security definer as $$
declare
  v_price          numeric(12,2);
  v_creator_id     uuid;
  v_reader_wallet  uuid;
  v_creator_wallet uuid;
  v_reader_balance numeric(12,2);
  v_platform_cut   numeric(12,2);
  v_creator_cut    numeric(12,2);
  v_debit_tx_id    uuid;
  v_credit_tx_id   uuid;
begin
  -- get chapter price and owning series user
  select c.price, s.user_id
  into v_price, v_creator_id
  from public.chapters c
  join public.series s on s.id = c.series_id
  where c.id = p_chapter_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'chapter_not_found');
  end if;

  if v_price is null or v_price <= 0 then
    return jsonb_build_object('ok', false, 'error', 'chapter_is_free');
  end if;

  -- check already unlocked
  if exists (
    select 1 from public.chapter_unlocks
    where user_id = p_reader_id and chapter_id = p_chapter_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_unlocked');
  end if;

  -- get reader wallet
  select id, balance into v_reader_wallet, v_reader_balance
  from public.wallets where user_id = p_reader_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_wallet');
  end if;

  if v_reader_balance < v_price then
    return jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  end if;

  -- get creator wallet
  select id into v_creator_wallet
  from public.wallets where user_id = v_creator_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'creator_no_wallet');
  end if;

  -- compute splits
  v_platform_cut := round(v_price * 0.15, 2);
  v_creator_cut  := v_price - v_platform_cut;

  -- debit reader
  update public.wallets set balance = balance - v_price where id = v_reader_wallet;

  insert into public.transactions (wallet_id, type, amount, description, reference_id)
  values (v_reader_wallet, 'debit', v_price, 'Chapter unlock', p_chapter_id)
  returning id into v_debit_tx_id;

  -- credit creator
  update public.wallets set balance = balance + v_creator_cut where id = v_creator_wallet;

  insert into public.transactions (wallet_id, type, amount, description, reference_id)
  values (v_creator_wallet, 'credit', v_creator_cut, 'Chapter sale (85%)', p_chapter_id)
  returning id into v_credit_tx_id;

  -- log platform earnings
  insert into public.platform_earnings (transaction_id, amount, description)
  values (v_debit_tx_id, v_platform_cut, 'Platform cut (15%) — chapter unlock');

  -- record unlock
  insert into public.chapter_unlocks (user_id, chapter_id, paid_amount)
  values (p_reader_id, p_chapter_id, v_price);

  return jsonb_build_object(
    'ok', true,
    'price', v_price,
    'creator_cut', v_creator_cut,
    'platform_cut', v_platform_cut
  );
end;
$$;

-- ─────────────────────────────────────────
--  8. Function: mock_topup  (testing only)
-- ─────────────────────────────────────────
create or replace function public.mock_topup(
  p_user_id uuid,
  p_amount  numeric
)
returns jsonb language plpgsql security definer as $$
declare
  v_wallet_id uuid;
begin
  select id into v_wallet_id from public.wallets where user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_wallet');
  end if;

  update public.wallets set balance = balance + p_amount where id = v_wallet_id;

  insert into public.transactions (wallet_id, type, amount, description)
  values (v_wallet_id, 'credit', p_amount, 'Mock top-up');

  return jsonb_build_object('ok', true, 'amount', p_amount);
end;
$$;
