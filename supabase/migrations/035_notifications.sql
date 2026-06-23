-- ============================================================
--  Enkhverse — Notifications table
-- ============================================================

create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  type       text        not null,
  data       jsonb       not null default '{}',
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id_read
  on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;

-- Users read their own notifications
create policy "notifications_own_read" on public.notifications
  for select using (auth.uid() = user_id);

-- Users mark their own as read
create policy "notifications_own_update" on public.notifications
  for update using (auth.uid() = user_id);

-- Service role inserts (application approvals, etc.)
create policy "notifications_service_insert" on public.notifications
  for insert with check (true);
