-- 021: book_styles and cover_design jsonb columns on series

alter table public.series
  add column if not exists book_styles  jsonb,
  add column if not exists cover_design jsonb;
