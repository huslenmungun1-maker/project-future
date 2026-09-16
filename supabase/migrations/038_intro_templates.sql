-- 038: saved intro-page design templates (Phase 4 of the intro-page canvas)
alter table public.series
  add column if not exists intro_templates jsonb not null default '[]'::jsonb;
