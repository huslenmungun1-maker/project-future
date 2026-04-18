# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build (includes --debug flag)
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test runner is configured.

## Architecture

**Enkhverse** is a Next.js 16 full-stack creator platform for publishing AI-assisted manga, webnovels, comics, and artbooks. It uses the App Router with locale-based routing, Supabase for auth + database, and OpenAI for creative assistance.

### Routing Structure

All user-facing routes live under `app/[locale]/` for i18n support (en, ko, mn, ja):

| Route | Purpose | Auth |
|---|---|---|
| `/` | Homepage | Public |
| `/[locale]/reader` | Browse published books/series | Public |
| `/[locale]/login` `/[locale]/login/signup` | Auth pages | Public |
| `/[locale]/studio` | Series management | Owner only |
| `/[locale]/publisher/books` | Book CRUD and metadata | Protected |
| `/[locale]/creator` | Creator application flow | Protected |
| `/[locale]/profile` | User profile | Protected |
| `/api/core-assistant` | OpenAI chat proxy | Protected |

**Middleware** (`middleware.ts`) handles:
- Redirecting non-localized URLs to `/en`
- Redirecting unauthenticated users to `/[locale]/login`
- Restricting `/studio/**`, `/publisher/**`, `/head/**` to the owner email (`NEXT_PUBLIC_OWNER_EMAIL`)

### Supabase Clients

Two clients — use the right one for the context:
- `lib/supabaseClient.ts` — anonymous/public client, for client components and public reads
- `lib/supabaseServer.ts` — SSR authenticated client via `createServerComponentClient`, for server components and protected reads

### Key Database Tables

- `books` — title, description, status, content_type, main_genre, subgenre, audience, reading_format
- `series` — title, description, cover_image_url, language, published, published_at, user_id
- `translations` — content_type, content_id, locale, title, description, body

Migrations are in `supabase/migrations/`.

### State Management

No global state library. Components manage state locally with `useState`/`useEffect` and query Supabase directly. Auth state comes from Supabase session via `createClientComponentClient()`.

### OpenAI Integration

`app/api/core-assistant/route.ts` proxies requests to `gpt-4.1-mini`. Expects `{ messages: [...] }` in the POST body, returns `{ reply: string }`. Used for task planning, outline generation, and title suggestions in the studio.

### Content Metadata

`lib/publisher-options.ts` defines the canonical lists for content type, genre, subgenre, audience, and reading format used across forms and filters.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_OWNER_EMAIL=        # Email that gets owner-level access
OPENAI_API_KEY=                 # Required for /api/core-assistant
```

## TypeScript

Path alias `@/*` maps to the project root. Strict mode is enabled.
