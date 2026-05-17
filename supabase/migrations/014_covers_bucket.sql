-- ============================================================
--  Enkhverse — covers storage bucket + policies
-- ============================================================

-- Ensure books.cover_url exists (canonical field for book covers)
alter table public.books add column if not exists cover_url text;

-- Create the covers bucket (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers',
  'covers',
  true,
  10485760,  -- 10 MB
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']
)
on conflict (id) do nothing;

-- Public read on all cover objects
create policy "covers_public_read" on storage.objects
  for select using (bucket_id = 'covers');

-- Authenticated users can upload / replace their own covers
create policy "covers_auth_insert" on storage.objects
  for insert with check (
    bucket_id = 'covers'
    and auth.role() = 'authenticated'
  );

create policy "covers_auth_update" on storage.objects
  for update using (
    bucket_id = 'covers'
    and auth.role() = 'authenticated'
  );

create policy "covers_auth_delete" on storage.objects
  for delete using (
    bucket_id = 'covers'
    and auth.role() = 'authenticated'
  );
