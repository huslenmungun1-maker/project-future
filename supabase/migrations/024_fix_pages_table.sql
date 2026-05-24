-- 024: fix pages table conflict
--
-- The existing `pages` table belongs to the publisher/books system
-- (columns: book_id, page_number, page_name, image_url, …).
-- Migrations 020 and 023 never applied because `create table if not exists`
-- silently skipped the creation.
--
-- Fix:
--   1. Rename old table → publisher_pages  (preserves data + policies)
--   2. Create new chapter-based pages table
--   3. Backfill chapter content (replaces migration 023)

-- ── 1. preserve old publisher pages table ────────────────────────
alter table public.pages rename to publisher_pages;

-- ── 2. new chapter-based pages table ────────────────────────────
create table public.pages (
  id          uuid        primary key default gen_random_uuid(),
  chapter_id  uuid        not null references public.chapters(id) on delete cascade,
  page_number int         not null,
  content     text,
  created_at  timestamptz not null default now()
);

create index pages_chapter_id_idx on public.pages(chapter_id);

alter table public.pages enable row level security;

create policy "pages_select" on public.pages
  for select using (true);

create policy "pages_insert" on public.pages
  for insert with check (
    exists (
      select 1 from public.chapters ch
      join  public.series s on s.id = ch.series_id
      where ch.id = pages.chapter_id
        and s.user_id = auth.uid()
    )
  );

create policy "pages_update" on public.pages
  for update using (
    exists (
      select 1 from public.chapters ch
      join  public.series s on s.id = ch.series_id
      where ch.id = pages.chapter_id
        and s.user_id = auth.uid()
    )
  );

create policy "pages_delete" on public.pages
  for delete using (
    exists (
      select 1 from public.chapters ch
      join  public.series s on s.id = ch.series_id
      where ch.id = pages.chapter_id
        and s.user_id = auth.uid()
    )
  );

-- ── 3. backfill: chapter content → pages (replaces migration 023) ─
insert into public.pages (chapter_id, page_number, content)
select c.id, 1, c.content
from   public.chapters c
where  c.content is not null
  and  trim(c.content) <> ''
  and  not exists (
         select 1 from public.pages p where p.chapter_id = c.id
       );
