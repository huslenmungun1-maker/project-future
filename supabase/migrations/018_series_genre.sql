-- Add genre column to series for story genre (Action, Romance, Fantasy, etc.)
alter table public.series add column if not exists genre text;
