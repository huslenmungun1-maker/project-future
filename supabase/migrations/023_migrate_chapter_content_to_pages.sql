-- 023: migrate existing chapter content → pages table
-- For every chapter that has content but zero pages, create page 1

insert into public.pages (chapter_id, page_number, content)
select c.id, 1, c.content
from   public.chapters c
where  c.content is not null
  and  trim(c.content) <> ''
  and  not exists (
         select 1 from public.pages p where p.chapter_id = c.id
       );
