-- ============================================================
--  Enkhverse — Profile social/banner fields + creator self-edit
-- ============================================================

alter table public.profiles add column if not exists banner_url    text;
alter table public.profiles add column if not exists instagram_url text;
alter table public.profiles add column if not exists twitter_url   text;
alter table public.profiles add column if not exists youtube_url   text;

-- content_types on creators so they are publicly readable
alter table public.creators add column if not exists content_types text[] not null default '{}';

-- Allow each creator to update their own row (bio, portfolio, content_types, display_name)
drop policy if exists "Creators can update own row" on public.creators;
create policy "Creators can update own row"
  on public.creators for update
  using  (auth.uid() = id)
  with check (auth.uid() = id);
