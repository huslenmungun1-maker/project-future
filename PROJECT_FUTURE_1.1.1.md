# PROJECT_FUTURE_1.1.1 — Enkhverse Roadmap

> Working directory: `C:\Users\User\Desktop\project-future`
> Stack: Next.js 16 App Router · Supabase Auth + DB · OpenAI · Tailwind
> Branch: `main`

---

## TASK 1 — Fix login redirect: owner → /studio, regular user → /profile

**Status:** ✅ Done

**Problem:** `app/[locale]/login/page.tsx` line 16 always falls back to `/${locale}/studio` after login, even for non-owner users.

**Fix:** After `signInWithPassword` succeeds, check `data.session.user.email` against `NEXT_PUBLIC_OWNER_EMAIL`. Owner → `/studio`, everyone else → `/profile`. Respect existing `?redirect` query param in both cases.

**Files touched:**
- `app/[locale]/login/page.tsx`

---

## TASK 2 — Restrict /studio to owner only in middleware

**Status:** ✅ Done

**Problem:** `middleware.ts` line 82 allows any logged-in user to access `/studio`. The studio component does its own email check client-side, but the route is still reachable by non-owners until that check runs.

**Fix:** In `middleware.ts`, add an owner check before allowing `/studio/**` — redirect non-owners to `/${locale}/profile`.

**Files touched:**
- `middleware.ts`

---

## TASK 3 — Build out the Profile page

**Status:** ✅ Done

**Problem:** `app/[locale]/profile/page.tsx` is a placeholder with no functionality.

**Tasks:**
- Fetch the current user session (SSR via `supabaseServer()`)
- Display: avatar (initials fallback), email, display name, role badge (Owner / Creator / Reader)
- Show account creation date
- Link to `/[locale]/creator/apply` if user is not already a creator
- Language preference selector (persisted to Supabase `profiles` table or localStorage)
- Sign-out button

**Files touched:**
- `app/[locale]/profile/page.tsx`
- `lib/supabaseServer.ts` (already exists, just use it)

---

## TASK 4 — Creator application flow

**Status:** ⬜ Todo

**Problem:** `app/[locale]/creator/apply/page.tsx` exists but needs a real form and backend.

**Tasks:**
- Build a multi-step form: name, social links, content type, portfolio URL, short bio
- On submit, insert into a `creator_applications` Supabase table
- Show pending/approved/rejected status on re-visit
- Add migration: `supabase/migrations/xxx_creator_applications.sql`

**Files touched:**
- `app/[locale]/creator/apply/page.tsx`
- `supabase/migrations/` (new migration)

---

## TASK 5 — NavBar auth state

**Status:** ✅ Done

**Problem:** `components/NavBar.tsx` likely does not reflect login/logout state or show profile link.

**Tasks:**
- Show "Login" button when unauthenticated
- Show profile avatar / email + "Sign Out" dropdown when authenticated
- Use `createClientComponentClient().auth.getSession()` on mount
- Subscribe to `onAuthStateChange` to stay in sync

**Files touched:**
- `components/NavBar.tsx`

---

## TASK 6 — Publisher book CRUD

**Status:** ⬜ Todo

**Problem:** `app/[locale]/publisher/books/` routes exist but need validation that the CRUD flow is complete and error-handled.

**Tasks:**
- Verify create / edit / delete flows for books work end-to-end
- Add cover image upload (reuse `components/studio/CoverImageUploader.tsx`)
- Add status toggle (draft / published)
- Add pagination if book list grows large

**Files touched:**
- `app/[locale]/publisher/books/` pages
- `components/publisher/` components

---

## TASK 7 — Reader browse page

**Status:** ⬜ Todo

**Problem:** `app/[locale]/reader/page.tsx` needs verified filtering and series cards.

**Tasks:**
- Filter by `content_type`, `main_genre`, `audience`
- Sort by `published_at` (newest first)
- Responsive grid of series cards with cover image, title, genre badge
- Series detail page → chapter list → chapter reader

**Files touched:**
- `app/[locale]/reader/page.tsx`
- `app/[locale]/reader/series/[id]/page.tsx`

---

## TASK 8 — i18n: translate all static UI strings

**Status:** ⬜ Todo

**Problem:** Several pages have hardcoded English strings. The studio page has an `UI_TEXT` map but other pages do not.

**Tasks:**
- Audit all pages under `app/[locale]/` for hardcoded strings
- Create `lib/i18n.ts` dictionaries for en / ko / mn / ja
- Replace hardcoded strings with dictionary lookups

**Files touched:**
- `lib/i18n.ts`
- All locale pages

---

## TASK 9 — OpenAI Core Assistant improvements

**Status:** ⬜ Todo

**Problem:** `app/api/core-assistant/route.ts` uses `gpt-4.1-mini` with no streaming, no system prompt, no rate limiting.

**Tasks:**
- Add a system prompt defining the assistant's role (manga/novel writing assistant)
- Add streaming response via `ReadableStream`
- Add per-user rate limiting (track in Supabase or Redis)
- Surface errors cleanly in `CoreAssistantPanel.tsx`

**Files touched:**
- `app/api/core-assistant/route.ts`
- `app/(studio)/CoreAssistantPanel.tsx`

---

## TASK 10 — Head dashboard: analytics & controls

**Status:** ⬜ Todo

**Problem:** `app/[locale]/head/page.tsx` is owner-only but needs real content.

**Tasks:**
- Total users count (from Supabase admin API)
- Total series / books / chapters counts
- Creator applications list with approve/reject actions
- Recent signups feed

**Files touched:**
- `app/[locale]/head/page.tsx`

---

## TASK 11 — Error boundaries and loading states

**Status:** ⬜ Todo

**Tasks:**
- Add `loading.tsx` files for slow routes (studio, publisher, reader)
- Add `error.tsx` files for graceful error display
- Replace raw `console.error` calls with user-visible error UI

---

## TASK 12 — Production readiness

**Status:** ⬜ Todo

**Tasks:**
- Audit all pages for missing `metadata` exports (SEO)
- Ensure all images use `next/image`
- Add `robots.txt` and `sitemap.xml`
- Verify `npm run build` passes cleanly with no TypeScript errors
- Set up Vercel preview deployments

---

## Execution order

```
1  → login redirect fix          (done)
2  → middleware studio guard
3  → profile page
4  → creator apply form
5  → navbar auth state
6  → publisher CRUD audit
7  → reader browse
8  → i18n strings
9  → core assistant improvements
10 → head dashboard
11 → error boundaries
12 → production readiness
```
