-- 034: add formatting jsonb to pages for poetry stanza controls
alter table public.pages
  add column if not exists formatting jsonb;
