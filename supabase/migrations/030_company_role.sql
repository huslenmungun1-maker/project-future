-- ============================================================
--  Enkhverse — Company role + company_applications table
-- ============================================================

-- ─────────────────────────────────────────
--  1. Add 'company' to profiles role constraint
-- ─────────────────────────────────────────

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('reader', 'creator', 'owner', 'company'));

-- ─────────────────────────────────────────
--  2. company_applications
-- ─────────────────────────────────────────

create table if not exists public.company_applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  applicant_email text,
  company_name    text not null,
  website         text,
  industry        text,
  description     text not null,
  motivation      text not null,
  agreed_to_terms boolean not null default false,
  status          text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  review_notes    text,
  created_at      timestamptz not null default now(),
  constraint company_applications_user_unique unique (user_id)
);

create index if not exists idx_company_applications_status
  on public.company_applications(status);

alter table public.company_applications enable row level security;

-- Applicant reads their own; owner reads all
create policy "company_applications_read" on public.company_applications
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where user_id = auth.uid() and role = 'owner')
  );

create policy "company_applications_self_insert" on public.company_applications
  for insert with check (auth.uid() = user_id);

create policy "company_applications_owner_update" on public.company_applications
  for update using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'owner')
  );
