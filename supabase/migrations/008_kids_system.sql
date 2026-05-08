-- ============================================================
--  Enkhverse Kids System
--  Run after migrations 001–007.
-- ============================================================

-- ─────────────────────────────────────────
--  1. Extend profiles
-- ─────────────────────────────────────────
alter table public.profiles
  add column if not exists account_type text not null default 'adult'
    check (account_type in ('adult', 'kid')),
  add column if not exists kid_theme jsonb default '{"background":"day","palette":"warm"}',
  add column if not exists age int;

-- Drop & recreate role constraint to include 'kid_creator' badge
-- (non-destructive — adds the value, existing rows unaffected)

-- ─────────────────────────────────────────
--  2. kid_accounts — links parent/teacher → kid
-- ─────────────────────────────────────────
create table if not exists public.kid_accounts (
  id                uuid primary key default gen_random_uuid(),
  created_by        uuid not null references auth.users(id) on delete cascade,
  kid_user_id       uuid not null references auth.users(id) on delete cascade,
  linked_teacher_id uuid references auth.users(id) on delete set null,
  family_name       text,
  school_name       text,
  age               int not null default 8,
  relationship      text not null check (relationship in ('parent_guardian', 'teacher')),
  earnings_receiver_type text not null default 'parent' check (earnings_receiver_type in ('parent', 'school')),
  earnings_receiver_id   uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  constraint kid_accounts_kid_unique unique (kid_user_id)
);

create index if not exists idx_kid_accounts_created_by   on public.kid_accounts(created_by);
create index if not exists idx_kid_accounts_kid_user_id  on public.kid_accounts(kid_user_id);
create index if not exists idx_kid_accounts_teacher_id   on public.kid_accounts(linked_teacher_id);

alter table public.kid_accounts enable row level security;

create policy "kid_accounts_parent_read" on public.kid_accounts
  for select using (auth.uid() = created_by or auth.uid() = kid_user_id or auth.uid() = linked_teacher_id);

create policy "kid_accounts_parent_insert" on public.kid_accounts
  for insert with check (auth.uid() = created_by);

create policy "kid_accounts_parent_update" on public.kid_accounts
  for update using (auth.uid() = created_by);

-- ─────────────────────────────────────────
--  3. kid_permissions — dual-approval gates
-- ─────────────────────────────────────────
create table if not exists public.kid_permissions (
  kid_user_id              uuid primary key references auth.users(id) on delete cascade,
  ai_enabled               boolean not null default false,
  approved_by_parent       boolean not null default false,
  approved_by_teacher      boolean not null default false,
  can_create_content       boolean not null default false,
  age_restrictions_lifted  boolean not null default false,
  updated_at               timestamptz not null default now()
);

alter table public.kid_permissions enable row level security;

create policy "kid_permissions_read" on public.kid_permissions
  for select
  using (
    auth.uid() = kid_user_id
    or exists (
      select 1 from public.kid_accounts ka
      where ka.kid_user_id = kid_permissions.kid_user_id
        and (ka.created_by = auth.uid() or ka.linked_teacher_id = auth.uid())
    )
  );

create policy "kid_permissions_parent_update" on public.kid_permissions
  for update
  using (
    exists (
      select 1 from public.kid_accounts ka
      where ka.kid_user_id = kid_permissions.kid_user_id
        and (ka.created_by = auth.uid() or ka.linked_teacher_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────
--  4. kid_chat_messages — fully monitored
-- ─────────────────────────────────────────
create table if not exists public.kid_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  message     text not null,
  is_flagged  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_kid_chat_sender   on public.kid_chat_messages(sender_id);
create index if not exists idx_kid_chat_receiver on public.kid_chat_messages(receiver_id);
create index if not exists idx_kid_chat_created  on public.kid_chat_messages(created_at desc);

alter table public.kid_chat_messages enable row level security;

-- Kid, parent, or teacher can read messages involving the kid
create policy "kid_chat_read" on public.kid_chat_messages
  for select
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or exists (
      select 1 from public.kid_accounts ka
      where (ka.kid_user_id = sender_id or ka.kid_user_id = receiver_id)
        and (ka.created_by = auth.uid() or ka.linked_teacher_id = auth.uid())
    )
  );

create policy "kid_chat_insert" on public.kid_chat_messages
  for insert with check (auth.uid() = sender_id);

-- ─────────────────────────────────────────
--  5. content_audience — on series, chapters, books
-- ─────────────────────────────────────────
alter table public.series   add column if not exists audience text not null default 'both' check (audience in ('kids','adults','both'));
alter table public.chapters add column if not exists audience text not null default 'both' check (audience in ('kids','adults','both'));

-- books table (may not exist in all deployments)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='books') then
    alter table public.books add column if not exists audience text not null default 'both' check (audience in ('kids','adults','both'));
  end if;
end $$;

-- ─────────────────────────────────────────
--  6. kid_content_submissions
-- ─────────────────────────────────────────
create table if not exists public.kid_content_submissions (
  id                      uuid primary key default gen_random_uuid(),
  kid_user_id             uuid not null references auth.users(id) on delete cascade,
  title                   text not null,
  description             text,
  content_type            text not null default 'story'
    check (content_type in ('story','drawing','comic','poem')),
  content                 text,
  image_url               text,
  status                  text not null default 'pending'
    check (status in ('pending','parent_approved','teacher_approved','both_approved','rejected','live')),
  parent_approved         boolean not null default false,
  teacher_approved        boolean not null default false,
  price                   numeric(12,2) not null default 0,
  earnings_receiver_type  text check (earnings_receiver_type in ('parent','school')),
  earnings_receiver_id    uuid references auth.users(id),
  rejection_reason        text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_kid_content_kid_id on public.kid_content_submissions(kid_user_id);
create index if not exists idx_kid_content_status on public.kid_content_submissions(status);

alter table public.kid_content_submissions enable row level security;

create policy "kid_content_self_read" on public.kid_content_submissions
  for select
  using (
    auth.uid() = kid_user_id
    or exists (
      select 1 from public.kid_accounts ka
      where ka.kid_user_id = kid_content_submissions.kid_user_id
        and (ka.created_by = auth.uid() or ka.linked_teacher_id = auth.uid())
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

create policy "kid_content_self_insert" on public.kid_content_submissions
  for insert with check (auth.uid() = kid_user_id);

create policy "kid_content_parent_update" on public.kid_content_submissions
  for update
  using (
    exists (
      select 1 from public.kid_accounts ka
      where ka.kid_user_id = kid_content_submissions.kid_user_id
        and (ka.created_by = auth.uid() or ka.linked_teacher_id = auth.uid())
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

-- ─────────────────────────────────────────
--  7. kid_earnings
-- ─────────────────────────────────────────
create table if not exists public.kid_earnings (
  id              uuid primary key default gen_random_uuid(),
  kid_user_id     uuid not null references auth.users(id) on delete cascade,
  amount          numeric(12,2) not null check (amount > 0),
  receiver_type   text not null check (receiver_type in ('parent','school')),
  receiver_id     uuid not null references auth.users(id),
  description     text not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists idx_kid_earnings_kid_id on public.kid_earnings(kid_user_id);

alter table public.kid_earnings enable row level security;

create policy "kid_earnings_read" on public.kid_earnings
  for select
  using (
    auth.uid() = kid_user_id
    or auth.uid() = receiver_id
    or exists (
      select 1 from public.kid_accounts ka
      where ka.kid_user_id = kid_earnings.kid_user_id
        and (ka.created_by = auth.uid() or ka.linked_teacher_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────
--  8. adult_flags — parent ↔ teacher concerns
-- ─────────────────────────────────────────
create table if not exists public.adult_flags (
  id           uuid primary key default gen_random_uuid(),
  flagged_by   uuid not null references auth.users(id) on delete cascade,
  kid_user_id  uuid not null references auth.users(id) on delete cascade,
  flagged_to   uuid not null references auth.users(id) on delete cascade,
  message      text not null,
  resolved     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_adult_flags_kid_id  on public.adult_flags(kid_user_id);
create index if not exists idx_adult_flags_flagged_to on public.adult_flags(flagged_to);

alter table public.adult_flags enable row level security;

create policy "adult_flags_involved_read" on public.adult_flags
  for select using (auth.uid() = flagged_by or auth.uid() = flagged_to);

create policy "adult_flags_insert" on public.adult_flags
  for insert with check (auth.uid() = flagged_by);

create policy "adult_flags_resolve" on public.adult_flags
  for update using (auth.uid() = flagged_by or auth.uid() = flagged_to);

-- ─────────────────────────────────────────
--  9. kid_read_history — for parent monitoring
-- ─────────────────────────────────────────
create table if not exists public.kid_read_history (
  id          uuid primary key default gen_random_uuid(),
  kid_user_id uuid not null references auth.users(id) on delete cascade,
  content_id  uuid not null,
  content_type text not null check (content_type in ('book','series','chapter')),
  content_title text,
  read_at     timestamptz not null default now()
);

create index if not exists idx_kid_read_history_kid on public.kid_read_history(kid_user_id);
create index if not exists idx_kid_read_history_at  on public.kid_read_history(read_at desc);

alter table public.kid_read_history enable row level security;

create policy "kid_read_history_read" on public.kid_read_history
  for select
  using (
    auth.uid() = kid_user_id
    or exists (
      select 1 from public.kid_accounts ka
      where ka.kid_user_id = kid_read_history.kid_user_id
        and (ka.created_by = auth.uid() or ka.linked_teacher_id = auth.uid())
    )
  );

create policy "kid_read_history_insert" on public.kid_read_history
  for insert with check (auth.uid() = kid_user_id);

-- ─────────────────────────────────────────
--  10. Trigger: auto-create kid_permissions on kid profile
-- ─────────────────────────────────────────
create or replace function public.create_kid_permissions_on_account()
returns trigger language plpgsql security definer as $$
begin
  insert into public.kid_permissions (kid_user_id)
  values (new.kid_user_id)
  on conflict (kid_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_kid_permissions on public.kid_accounts;
create trigger trg_create_kid_permissions
  after insert on public.kid_accounts
  for each row execute function public.create_kid_permissions_on_account();

-- ─────────────────────────────────────────
--  11. Function: approve_kid_content (dual-approval)
-- ─────────────────────────────────────────
create or replace function public.approve_kid_content(
  p_submission_id uuid,
  p_approver_id   uuid,
  p_role          text   -- 'parent' or 'teacher'
)
returns jsonb language plpgsql security definer as $$
declare
  v_sub          record;
  v_new_parent   boolean;
  v_new_teacher  boolean;
  v_new_status   text;
begin
  select * into v_sub from public.kid_content_submissions where id = p_submission_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_new_parent  := v_sub.parent_approved;
  v_new_teacher := v_sub.teacher_approved;

  if p_role = 'parent'  then v_new_parent  := true; end if;
  if p_role = 'teacher' then v_new_teacher := true; end if;

  if v_new_parent and v_new_teacher then
    v_new_status := 'both_approved';
  elsif v_new_parent then
    v_new_status := 'parent_approved';
  elsif v_new_teacher then
    v_new_status := 'teacher_approved';
  else
    v_new_status := 'pending';
  end if;

  update public.kid_content_submissions
  set parent_approved  = v_new_parent,
      teacher_approved = v_new_teacher,
      status           = v_new_status,
      updated_at       = now()
  where id = p_submission_id;

  return jsonb_build_object('ok', true, 'status', v_new_status);
end;
$$;

-- ─────────────────────────────────────────
--  12. Keyword filter for kids content (stored array)
-- ─────────────────────────────────────────
create table if not exists public.kids_blocked_keywords (
  keyword text primary key,
  added_at timestamptz not null default now()
);

alter table public.kids_blocked_keywords enable row level security;

create policy "kids_blocked_keywords_owner_read" on public.kids_blocked_keywords
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

create policy "kids_blocked_keywords_owner_write" on public.kids_blocked_keywords
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

-- Seed basic blocked keywords
insert into public.kids_blocked_keywords (keyword) values
  ('violence'), ('blood'), ('murder'), ('kill'), ('death'),
  ('romance'), ('kiss'), ('love scene'), ('adult'), ('18+'),
  ('horror'), ('scary'), ('nightmare'), ('hate'), ('weapon')
on conflict do nothing;
