-- 020: series price & page_size; text pages table

alter table public.series
  add column if not exists price     numeric(12,2) not null default 0,
  add column if not exists page_size text          not null default 'A4';

create table if not exists public.pages (
  id          uuid        primary key default gen_random_uuid(),
  chapter_id  uuid        not null references public.chapters(id) on delete cascade,
  page_number int         not null,
  content     text,
  created_at  timestamptz not null default now()
);

create index if not exists pages_chapter_id_idx on public.pages(chapter_id);

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
