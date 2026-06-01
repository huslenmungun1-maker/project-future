-- ============================================================
--  Enkhverse — swap_book_chapter_numbers function
--  Atomically swaps chapter_number between two chapters.
--
--  Called from publisher/books/[id] page when the user
--  clicks the up/down reorder buttons on a chapter.
--
--  Uses a sentinel value (-999999) to side-step any UNIQUE
--  constraint on (book_id, chapter_number) during the swap:
--    1. Move first chapter to sentinel (clears the slot)
--    2. Move second chapter into first's old slot
--    3. Move first chapter into second's old slot
--  All three UPDATE statements run inside the same PL/pgSQL
--  transaction, so no other session ever sees the sentinel.
-- ============================================================

create or replace function public.swap_book_chapter_numbers(
  first_chapter_id      uuid,
  first_chapter_number  integer,
  second_chapter_id     uuid,
  second_chapter_number integer
)
returns void language plpgsql security definer as $$
begin
  -- Step 1: vacate the first slot with a sentinel that cannot
  --         collide with any real chapter number
  update public.chapters
  set chapter_number = -999999
  where id = first_chapter_id;

  -- Step 2: slide second chapter into first's old position
  update public.chapters
  set chapter_number = first_chapter_number
  where id = second_chapter_id;

  -- Step 3: place first chapter into second's old position
  update public.chapters
  set chapter_number = second_chapter_number
  where id = first_chapter_id;
end;
$$;
