-- ============================================================
--  Enkhverse — reading_progress table
--  Stores a reader's last-seen page position per piece of
--  content so they can resume where they left off.
--
--  content_type values:
--    'book_spread'     — spread index in /reader/series/[id]/book
--    'series_chapter'  — chapter_number in series chapter reader
--    'book_chapter'    — chapter_number in book chapter reader
--  last_page: spread index (book_spread) OR chapter_number (others)
-- ============================================================

create table if not exists public.reading_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  content_id   uuid not null,
  content_type text not null,
  last_page    integer not null default 0,
  updated_at   timestamptz not null default now(),
  constraint reading_progress_unique unique (user_id, content_id)
);

create index if not exists idx_reading_progress_user_id
  on public.reading_progress(user_id);

alter table public.reading_progress enable row level security;

-- Users can only read and write their own progress
create policy "reading_progress_self"
  on public.reading_progress for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
