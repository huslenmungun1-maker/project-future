-- ============================================================
--  Enkhverse — Creator onboarding tables
--  Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================


-- ─────────────────────────────────────────
--  1. creator_applications
--     One row per user submission.
--     status: pending → approved | rejected
-- ─────────────────────────────────────────

create table if not exists public.creator_applications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,

  -- Step 1 – About you
  display_name     text not null,
  bio              text not null,

  -- Step 2 – Content type
  content_types    text[] not null default '{}',   -- e.g. ['manga','webtoon']
  content_description text,

  -- Step 3 – Portfolio
  portfolio_url    text,
  sample_work_url  text,

  -- Step 4 – Motivation + agreement
  motivation       text not null,
  agreed_to_terms  boolean not null default false,

  -- Review fields (filled by owner/admin)
  status           text not null default 'pending'
                     check (status in ('pending','approved','rejected')),
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,
  review_notes     text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- One active application per user (prevent spam re-submissions)
  constraint one_pending_per_user unique (user_id)
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_creator_applications_updated_at on public.creator_applications;
create trigger trg_creator_applications_updated_at
  before update on public.creator_applications
  for each row execute procedure public.set_updated_at();


-- ─────────────────────────────────────────
--  2. creators
--     Populated when an application is
--     approved (manually or via trigger).
-- ─────────────────────────────────────────

create table if not exists public.creators (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text not null,
  bio              text,
  portfolio_url    text,
  status           text not null default 'active'
                     check (status in ('active','suspended')),
  application_id   uuid references public.creator_applications(id),
  approved_at      timestamptz not null default now(),
  created_at       timestamptz not null default now()
);


-- ─────────────────────────────────────────
--  3. Row-Level Security
-- ─────────────────────────────────────────

alter table public.creator_applications enable row level security;
alter table public.creators            enable row level security;

-- creator_applications: users manage their own row
create policy "Users can insert own application"
  on public.creator_applications for insert
  with check (auth.uid() = user_id);

create policy "Users can view own application"
  on public.creator_applications for select
  using (auth.uid() = user_id);

create policy "Users can update own pending application"
  on public.creator_applications for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id);

-- creators: public read (for author pages), owner writes
create policy "Creators are publicly readable"
  on public.creators for select
  using (true);

create policy "Only service role inserts creators"
  on public.creators for insert
  with check (false);   -- insert only via SQL editor / server-side


-- ─────────────────────────────────────────
--  4. Indexes
-- ─────────────────────────────────────────

create index if not exists idx_creator_applications_user_id
  on public.creator_applications(user_id);

create index if not exists idx_creator_applications_status
  on public.creator_applications(status);
