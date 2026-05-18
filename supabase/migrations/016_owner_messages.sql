-- Creator-to-owner messaging system
create table if not exists owner_messages (
  id          uuid        primary key default gen_random_uuid(),
  sender_id   uuid        references auth.users(id) on delete cascade not null,
  sender_name text        not null default '',
  message_type text       not null default 'general',
  subject     text        not null default '',
  body        text        not null,
  status      text        not null default 'unread',
  content_ref text,
  created_at  timestamptz default now() not null
);

alter table owner_messages enable row level security;

-- Creators can send their own messages
create policy "sender can insert messages"
  on owner_messages for insert
  with check (auth.uid() = sender_id);

-- Creators can read their own messages
create policy "sender can read own messages"
  on owner_messages for select
  using (auth.uid() = sender_id);

-- Owner (profiles.role = 'owner') can read all messages
create policy "owner can read all messages"
  on owner_messages for select
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'owner'
    )
  );

-- Owner can update message status
create policy "owner can update messages"
  on owner_messages for update
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'owner'
    )
  );
