-- ============================================================
--  Enkhverse — View count columns + atomic increment RPCs
-- ============================================================

-- Columns (safe to re-run)
alter table public.books   add column if not exists views bigint not null default 0;
alter table public.series  add column if not exists views bigint not null default 0;

-- Atomic increment functions — SECURITY DEFINER so anon readers
-- can increment without bypassing RLS on the whole table.
create or replace function public.increment_book_views(target_id uuid)
returns void language sql security definer as $$
  update public.books set views = views + 1 where id = target_id;
$$;

create or replace function public.increment_series_views(target_id uuid)
returns void language sql security definer as $$
  update public.series set views = views + 1 where id = target_id;
$$;

-- Allow anon and authenticated roles to call these functions
grant execute on function public.increment_book_views(uuid)   to anon, authenticated;
grant execute on function public.increment_series_views(uuid) to anon, authenticated;
