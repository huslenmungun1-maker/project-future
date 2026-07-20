-- ============================================================
--  Enkhverse — Manga reading direction + display mode
-- ============================================================

alter table public.series
  add column if not exists reading_direction text not null default 'ltr',
  add column if not exists display_mode text not null default 'scroll';

alter table public.series
  drop constraint if exists series_reading_direction_check,
  add constraint series_reading_direction_check check (reading_direction in ('ltr', 'rtl'));

alter table public.series
  drop constraint if exists series_display_mode_check,
  add constraint series_display_mode_check check (display_mode in ('scroll', 'paginated'));
