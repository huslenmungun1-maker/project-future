# Enkhverse Build Status

## Last updated: 2026-04-19

## In Progress
_(none — all tasks complete)_

## Completed
- 1.1.23 Removed future pages section (done as part of 1.1.21 redesign)
- 1.1.22 Removed early build text (done as part of 1.1.21 redesign)
- 1.1.21 Redesigned homepage YouTube-style: left sidebar with navigation + locale switcher, hero section, Featured + New Releases content placeholders, Creator CTA; removed all "early build" text and "future pages" section
- 1.1.9 Email confirmation flow: auth callback route at /auth/callback, welcome page at /[locale]/welcome, login page redesigned with soft aesthetic and proper "check your email" screen on signup; **ACTION REQUIRED**: set Supabase Site URL and Redirect URL to include /auth/callback
- 1.1.8 Added profiles table with reader/creator/owner roles; migration 002_user_roles.sql created; middleware + NavBar now check profiles table with NEXT_PUBLIC_OWNER_EMAIL as fallback; NavBar also shows Admin link for owners; **ACTION REQUIRED**: run migration 002, then run the UPDATE statement at the bottom to set your owner role
- 1.1.7 Built admin review panel at /head: lists all creator applications with filter tabs (pending/approved/rejected), expandable detail rows, approve/reject actions with optional review notes, toast feedback
- 1.1.6 Merged Studio and Publisher into single Studio nav item; removed Publisher link from navbar
- 1.1.5 Added proper empty states to reader: unified empty view when nothing published, per-section empty states with icons and descriptive text
- 1.1.3 Publisher nav link already had locale prefix; corrected target from /publisher/books → /publisher for consistency
- 1.1.2 Fixed creator apply page: combined auth+existing-check into single async init to eliminate race condition where form flashed before existing-application check completed

## Upcoming
- 1.1.3 Fix publisher nav locale prefix
- 1.1.5 Add empty state to reader page
- 1.1.6 Merge Studio + Publisher nav
- 1.1.7 Build admin review panel at /head
- 1.1.8 Role system replacing hardcoded owner email
- 1.1.9 Email confirmation flow
- 1.1.21 Homepage YouTube-style redesign
- 1.1.22 Remove early build text
- 1.1.23 Remove future pages section

## Blockers
_(none)_
