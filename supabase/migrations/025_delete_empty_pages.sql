-- 025: remove blank pages created during chapter-content backfill
-- Some chapters received a migrated page_1 (with content) plus an empty page_2.
-- Delete any page whose content is NULL or whitespace-only.

delete from public.pages
where content is null
   or trim(content) = '';
