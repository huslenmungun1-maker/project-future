-- ============================================================
--  Fix: add price column to chapters if missing
--  (migration 006 included this but may have run before the
--   chapters table existed — safe to re-run idempotently)
-- ============================================================

alter table public.chapters
  add column if not exists price numeric(12,2) not null default 0;
