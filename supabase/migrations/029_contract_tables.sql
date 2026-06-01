-- ============================================================
--  Enkhverse — Contract system tables
-- ============================================================

-- ─────────────────────────────────────────
--  1. companies
-- ─────────────────────────────────────────

create table if not exists public.companies (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  website    text,
  logo_url   text,
  verified   boolean not null default false,
  created_at timestamptz not null default now(),
  constraint companies_user_id_unique unique (user_id)
);

create index if not exists idx_companies_user_id on public.companies(user_id);

alter table public.companies enable row level security;

create policy "companies_self_read" on public.companies
  for select using (auth.uid() = user_id);

create policy "companies_public_read" on public.companies
  for select using (true);

-- ─────────────────────────────────────────
--  2. contracts
-- ─────────────────────────────────────────

create table if not exists public.contracts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  offeror_type text not null check (offeror_type in ('owner', 'company')),
  offeror_id   uuid not null,
  creator_id   uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'draft'
                 check (status in ('draft','sent','accepted','declined','active','completed','cancelled')),
  total_amount numeric(12,2) not null default 0,
  currency     text not null default 'usd',
  deadline     timestamptz,
  terms        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_contracts_creator_id  on public.contracts(creator_id);
create index if not exists idx_contracts_offeror_id  on public.contracts(offeror_id);
create index if not exists idx_contracts_status      on public.contracts(status);

alter table public.contracts enable row level security;

-- Creator can read contracts addressed to them
create policy "contracts_creator_read" on public.contracts
  for select using (auth.uid() = creator_id);

-- Offeror can read their own contracts
create policy "contracts_offeror_read" on public.contracts
  for select using (auth.uid() = offeror_id);

-- Owner can read all contracts
create policy "contracts_owner_read" on public.contracts
  for select using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'owner')
  );

-- ─────────────────────────────────────────
--  3. contract_milestones
-- ─────────────────────────────────────────

create table if not exists public.contract_milestones (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  title       text not null,
  description text,
  amount      numeric(12,2) not null default 0,
  due_date    timestamptz,
  status      text not null default 'pending'
                check (status in ('pending','submitted','approved','paid')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_contract_milestones_contract_id
  on public.contract_milestones(contract_id);

alter table public.contract_milestones enable row level security;

create policy "contract_milestones_parties_read" on public.contract_milestones
  for select using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and (c.creator_id = auth.uid() or c.offeror_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────
--  4. contract_signatures
-- ─────────────────────────────────────────

create table if not exists public.contract_signatures (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('offeror','creator')),
  agreed_at   timestamptz not null default now(),
  ip_address  text,
  constraint contract_signatures_unique unique (contract_id, user_id)
);

create index if not exists idx_contract_signatures_contract_id
  on public.contract_signatures(contract_id);

alter table public.contract_signatures enable row level security;

create policy "contract_signatures_parties_read" on public.contract_signatures
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and (c.creator_id = auth.uid() or c.offeror_id = auth.uid())
    )
  );
