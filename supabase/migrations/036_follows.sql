-- ============================================================
--  Enkhverse — Follows table + new_follower notification trigger
-- ============================================================

create table if not exists public.follows (
  follower_id  uuid        not null references auth.users(id) on delete cascade,
  followed_id  uuid        not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follows_no_self_follow check (follower_id <> followed_id)
);

create index if not exists idx_follows_followed_id on public.follows(followed_id);
create index if not exists idx_follows_follower_id on public.follows(follower_id);

alter table public.follows enable row level security;

-- Anyone can read follows (needed for public follower counts)
create policy "follows_public_read" on public.follows
  for select using (true);

-- Authenticated users can follow
create policy "follows_own_insert" on public.follows
  for insert with check (auth.uid() = follower_id);

-- Authenticated users can unfollow
create policy "follows_own_delete" on public.follows
  for delete using (auth.uid() = follower_id);

-- ─────────────────────────────────────────
--  Trigger: insert new_follower notification
-- ─────────────────────────────────────────

create or replace function public.notify_new_follower()
returns trigger language plpgsql security definer as $$
declare
  v_name text;
begin
  select display_name into v_name
  from public.profiles
  where user_id = NEW.follower_id;

  insert into public.notifications (user_id, type, data)
  values (
    NEW.followed_id,
    'new_follower',
    jsonb_build_object('follower_name', coalesce(v_name, 'Someone'))
  );
  return NEW;
end;
$$;

create trigger trg_notify_new_follower
  after insert on public.follows
  for each row execute function public.notify_new_follower();
