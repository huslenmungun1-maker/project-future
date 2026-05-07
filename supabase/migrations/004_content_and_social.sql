-- ============================================================
--  Enkhverse — Content loop + social graph
--  Run in Supabase SQL editor after migrations 001–003.
-- ============================================================

-- ─────────────────────────────────────────
--  1. Profile enhancements
-- ─────────────────────────────────────────
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio      text;
create unique index if not exists idx_profiles_username
  on public.profiles(username) where username is not null;

-- ─────────────────────────────────────────
--  2. Series enhancements
-- ─────────────────────────────────────────
alter table public.series add column if not exists project_type text default 'novel';
alter table public.series drop  constraint if exists series_project_type_check;
alter table public.series add   constraint series_project_type_check
  check (project_type in ('novel','manga','webtoon','comic','artbook'));

-- ─────────────────────────────────────────
--  3. Chapter enhancements
-- ─────────────────────────────────────────
alter table public.chapters add column if not exists scheduled_at timestamptz;

-- ─────────────────────────────────────────
--  4. chapter_pages — manga/comic images
-- ─────────────────────────────────────────
create table if not exists public.chapter_pages (
  id          uuid primary key default gen_random_uuid(),
  chapter_id  uuid not null references public.chapters(id) on delete cascade,
  order_index int  not null default 0,
  image_url   text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_chapter_pages_chapter_id
  on public.chapter_pages(chapter_id);

alter table public.chapter_pages enable row level security;

create policy "chapter_pages_public_read" on public.chapter_pages
  for select using (true);

create policy "chapter_pages_creator_write" on public.chapter_pages
  for all
  using (
    exists (
      select 1 from public.chapters c
      join public.series s on s.id = c.series_id
      where c.id = chapter_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chapters c
      join public.series s on s.id = c.series_id
      where c.id = chapter_id and s.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
--  5. read_progress — track reading position
-- ─────────────────────────────────────────
create table if not exists public.read_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id)   on delete cascade,
  series_id  uuid not null references public.series(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  updated_at timestamptz not null default now(),
  constraint read_progress_unique unique (user_id, series_id)
);
create index if not exists idx_read_progress_user_id on public.read_progress(user_id);

alter table public.read_progress enable row level security;
create policy "read_progress_self" on public.read_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
--  6. follows — social graph
-- ─────────────────────────────────────────
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id)
);
create index if not exists idx_follows_followed_id on public.follows(followed_id);
create index if not exists idx_follows_follower_id on public.follows(follower_id);

alter table public.follows enable row level security;
create policy "follows_public_read"   on public.follows for select using (true);
create policy "follows_self_insert"   on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_self_delete"   on public.follows for delete  using (auth.uid() = follower_id);

-- ─────────────────────────────────────────
--  7. notifications
-- ─────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,   -- application_approved | application_rejected | new_follower
  data       jsonb not null default '{}',
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_unread
  on public.notifications(user_id, is_read) where not is_read;

alter table public.notifications enable row level security;
create policy "notifications_self_read"   on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_self_update" on public.notifications for update using (auth.uid() = user_id);
create policy "notifications_insert"      on public.notifications for insert with check (true);

-- ─────────────────────────────────────────
--  8. Trigger: notify on application status change
-- ─────────────────────────────────────────
create or replace function public.notify_application_status_change()
returns trigger language plpgsql security definer as $$
begin
  if new.status in ('approved','rejected') and old.status = 'pending' then
    insert into public.notifications (user_id, type, data)
    values (
      new.user_id,
      'application_' || new.status,
      jsonb_build_object(
        'review_notes', coalesce(new.review_notes, ''),
        'reviewed_at',  coalesce(new.reviewed_at::text, now()::text)
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_application on public.creator_applications;
create trigger trg_notify_application
  after update on public.creator_applications
  for each row execute function public.notify_application_status_change();

-- ─────────────────────────────────────────
--  9. Trigger: notify on new follow
-- ─────────────────────────────────────────
create or replace function public.notify_new_follow()
returns trigger language plpgsql security definer as $$
declare
  v_name text;
begin
  select coalesce(display_name, username, 'Someone')
  into v_name
  from public.profiles
  where id = new.follower_id;

  insert into public.notifications (user_id, type, data)
  values (
    new.followed_id,
    'new_follower',
    jsonb_build_object(
      'follower_id',   new.follower_id,
      'follower_name', coalesce(v_name, 'Someone')
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow
  after insert on public.follows
  for each row execute function public.notify_new_follow();
