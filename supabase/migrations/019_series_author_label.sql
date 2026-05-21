-- Add author_label column to series (e.g. "Written by", "Created by", etc.)
alter table public.series add column if not exists author_label text;
