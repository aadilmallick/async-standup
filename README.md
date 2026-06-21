# AsyncStand

> Async standups without the Slack chaos.

A production-quality **MVP 0.1** of a B2B async standup web app. Managers create
reusable standup templates, start one-off or recurring sessions, share a public
link, and collect responses from teammates — **no employee accounts required**.
The dashboard shows the **latest response per email**, while every historical
submission is preserved.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- shadcn/ui-style components (Radix primitives)
- **Clerk** (`@clerk/nextjs`) for manager auth
- **Neon Postgres** (`@neondatabase/serverless`) + **Drizzle ORM**
- **Zod** validation
- **TanStack Query** (client fetching, mutations, 30s polling)
- **Upstash QStash** (recurring schedules + delayed close jobs)
- **temporal-polyfill** for date/time
- **nanoid** for unguessable public slugs

## Features (MVP 0.1)

1. Manager authentication (Clerk)
2. Organization/workspace support (auto-created per user on first login)
3. Template create / edit / delete with ordered questions
4. Manual standup session creation from a template (questions are snapshotted)
5. Public standup submission page (no account needed)
6. Latest-response-per-email dedup, historical submissions preserved
7. Manager session dashboard with response table
8. Close / reopen session
9. Past sessions list with open/closed/all filters
10. Recurring schedules (daily / weekdays / custom days)
11. Dynamic QStash schedule creation for recurring standups
12. Automatic closing after a configured duration (delayed QStash job)
13. 30-second polling on the session response page
14. Clean SaaS dashboard UI

> Not in this MVP (by design, but the schema is ready for them): Slack/Teams,
> billing, AI summaries, email reminders, employee accounts, analytics.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Database (Neon Postgres) — pooled connection string
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Upstash QStash
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# App — publicly reachable base URL (QStash destination + public links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Run locally

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm db:migrate              # apply the Drizzle migration to Neon
pnpm dev                     # http://localhost:3000
```

Optional sample data (run after signing in once so your workspace exists):

```bash
pnpm seed
```

## Drizzle migrations

```bash
pnpm db:generate   # regenerate SQL after editing src/db/schema.ts
pnpm db:migrate    # apply migrations (needs DATABASE_URL)
pnpm db:studio     # browse data
```

The committed migration lives in `drizzle/`.

## Configure Clerk

1. Create an application at <https://dashboard.clerk.com>.
2. Copy the **Publishable key** and **Secret key** into `.env.local`.
3. Email/password and social logins work out of the box. Organizations are
   **not** required — AsyncStand auto-creates a workspace per user on first
   dashboard load (see `ensureUserAndOrg()` in `src/lib/auth.ts`). The schema
   keeps `organizations` / `organization_members` tables so multi-tenant and
   Clerk Organizations can be layered on later.

## Configure Neon

1. Create a project at <https://neon.tech> and a database.
2. Copy the **pooled** connection string into `DATABASE_URL`.
3. Run `pnpm db:migrate`.

The app uses `@neondatabase/serverless` over HTTP (`drizzle-orm/neon-http`),
which is Vercel/edge-friendly.

## Configure Upstash QStash

1. Create a QStash instance at <https://console.upstash.com/qstash>.
2. Copy **QSTASH_TOKEN**, **QSTASH_CURRENT_SIGNING_KEY**, and
   **QSTASH_NEXT_SIGNING_KEY** into `.env.local`.
3. Set `NEXT_PUBLIC_APP_URL` to a **publicly reachable** URL. QStash calls your
   webhooks over the internet, so for local development expose your machine with
   a tunnel (e.g. `ngrok http 3000` or `cloudflared tunnel`) and use that URL.

## How QStash scheduling works

AsyncStand uses **two** QStash mechanisms:

### Recurring "open" schedules

When a manager creates a recurring schedule, the app:

1. Builds a cron expression with a timezone prefix, e.g.
   `CRON_TZ=America/New_York 0 9 * * 1,3,5` (see `buildCronExpression()` in
   `src/lib/cron.ts`).
2. Creates a QStash **schedule** with a deterministic id
   `recurring-standup-${scheduleId}` that POSTs to
   `/api/qstash/open-recurring-standup` with `{ recurringScheduleId }`.
   Editing the schedule overwrites the same id; pausing/deleting removes it.

When the schedule fires, `/api/qstash/open-recurring-standup`:

1. Verifies the QStash signature.
2. Loads the schedule; **does nothing** if it is paused/deleted.
3. Confirms the org + template still exist.
4. Claims an idempotency row in `recurring_schedule_runs`
   (`(recurring_schedule_id, scheduled_for_key)` is unique, where
   `scheduled_for_key` is the run time rounded to the minute in the schedule's
   timezone). A duplicate QStash retry hits the constraint and returns success
   without creating a second session.
5. Creates a new session by **snapshotting** the template's current questions,
   generates a public slug, formats the title via Temporal
   (`{templateTitle} — Jun 20, 2026`), sets `scheduled_close_at`, and links
   `recurring_schedule_id`.
6. Publishes a delayed "close" job (below) and stores its message id.
7. Updates `last_run_at`.

### Delayed "close" jobs

Whenever a session is created with a close duration (manual session with
`closeAfterMinutes`, or a recurring run), the app publishes a **delayed**
QStash message to `/api/qstash/close-standup-session` with `{ sessionId }` and a
delay of `closeAfterMinutes`. That endpoint:

1. Verifies the QStash signature.
2. Returns `{ ok: true, alreadyClosed: true }` if the session is already closed
   (so a **manual close overrides** the scheduled close, and retries are safe).
3. Otherwise sets `status = closed` and `closed_at = now`.

There is **no** separate recurring close cron — each session schedules its own
one-off close, exactly as the spec requires.

## How recurring standups are created and closed (summary)

```
QStash recurring schedule (cron, tz)
        │  fires
        ▼
/api/qstash/open-recurring-standup
        │  snapshot questions → new session (open) + scheduled_close_at
        │  publish delayed close job
        ▼
/api/qstash/close-standup-session   (after closeAfterMinutes)
        │  set status=closed (idempotent)
```

## Security notes

- All `/dashboard` and manager `/api/*` routes require Clerk auth
  (`src/middleware.ts`). Every manager query is filtered by `organization_id`;
  membership is verified server-side (`src/lib/auth.ts`).
- Public `/s/[publicSlug]` requires no auth and respondents can only submit —
  they cannot read the dashboard or other responses.
- Public slugs are unguessable (`nanoid`, ~60 bits).
- Closed sessions reject submissions.
- QStash webhooks verify request signatures.
- `// TODO: rate limiting` is marked on the public submit endpoint
  (`src/app/api/public/standup-submit/route.ts`) — add Upstash Ratelimit before
  production. IP hashing is left disabled (`ip_hash` stays null) for MVP.

## Known limitations

- Single organization per user (auto-created); no Clerk Organizations UI yet.
- Only the `textarea` question type is implemented (schema supports more via
  `question_type` / `options`).
- No rate limiting on the public submission endpoint yet (TODO placeholder).
- Recurring schedules need a publicly reachable `NEXT_PUBLIC_APP_URL`; cron jobs
  won't reach `localhost` without a tunnel.
- `next/font` (Geist) is fetched at build time, so the first build needs network
  access.
- No automated tests in this MVP.

## Project structure

```
src/
  app/
    page.tsx                     # landing
    sign-in/, sign-up/           # Clerk
    s/[publicSlug]/              # public form + submitted page
    dashboard/                   # manager UI (templates, sessions, schedules)
    api/
      templates/, sessions/, schedules/
      public/standup-submit/
      qstash/open-recurring-standup/, qstash/close-standup-session/
  components/  ui/, dashboard/, forms/, public/
  db/          schema.ts, index.ts, queries.ts
  lib/         auth, qstash, temporal, cron, validation, slugs, email, sessions
  hooks/       use-session-responses.ts
drizzle/                          # generated migration
scripts/seed.ts
```
