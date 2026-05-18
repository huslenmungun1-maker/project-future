-- Add applicant_email to creator_applications for display in admin panel
alter table public.creator_applications
  add column if not exists applicant_email text not null default '';
