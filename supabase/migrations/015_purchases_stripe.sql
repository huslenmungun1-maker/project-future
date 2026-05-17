-- ============================================================
--  Enkhverse — Stripe purchases table
-- ============================================================

create table if not exists public.purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  chapter_id        uuid not null references public.chapters(id) on delete cascade,
  stripe_session_id text not null,
  amount_paid       numeric(12,2) not null,
  currency          text not null default 'usd',
  created_at        timestamptz not null default now(),
  constraint purchases_unique_session      unique (stripe_session_id),
  constraint purchases_unique_user_chapter unique (user_id, chapter_id)
);

create index if not exists idx_purchases_user_id    on public.purchases(user_id);
create index if not exists idx_purchases_chapter_id on public.purchases(chapter_id);

alter table public.purchases enable row level security;

-- Readers can see their own purchases
create policy "purchases_self_read" on public.purchases
  for select using (auth.uid() = user_id);

-- Inserts are performed by API routes using the service role key (bypasses RLS)
