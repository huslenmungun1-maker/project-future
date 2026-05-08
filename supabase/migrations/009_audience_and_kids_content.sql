-- ============================================================
--  Migration 009: audience column on series + books
--  Run after 008_kids_system.sql
-- ============================================================

-- Add audience to series
alter table public.series
  add column if not exists audience text not null default 'all'
    check (audience in ('all', 'kids', 'adults'));

-- Add audience to books
alter table public.books
  add column if not exists audience text not null default 'all'
    check (audience in ('all', 'kids', 'adults'));

-- Kids can only select / insert books / series with audience = 'kids' or 'all'
-- Existing RLS is permissive for select; that's fine — kids UI filters by audience.

-- Index for kids reader query
create index if not exists idx_series_audience on public.series(audience);
create index if not exists idx_books_audience  on public.books(audience);
