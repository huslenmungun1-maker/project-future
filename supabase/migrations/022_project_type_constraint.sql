-- 022: expand project_type check constraint for new content types

alter table public.series
  drop constraint if exists series_project_type_check;

alter table public.series
  add constraint series_project_type_check
  check (project_type in (
    'book', 'manga', 'comic', 'poetry', 'moodboard', 'shortstory', 'kids',
    'novel', 'webtoon', 'artbook'
  ));
