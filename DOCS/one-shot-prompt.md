Build a production-quality MVP version 0.1 of a B2B async standup web app.

The app lets authenticated managers create reusable standup form templates, start one-off standup sessions from templates, create recurring scheduled standups from templates, share public standup links with employees, collect responses without requiring employee accounts, and view deduplicated latest responses by respondent email.

Use this exact stack:

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Clerk for manager authentication and organizations
* Neon Postgres
* Drizzle ORM
* Zod for validation
* TanStack Query for client-side fetching, mutations, cache invalidation, and polling
* Upstash QStash for dynamic recurring standup scheduling and delayed close jobs
* temporal-polyfill for date/time handling
* nanoid or crypto-safe random IDs for public slugs
* Vercel-compatible deployment

Important package preferences:

* Use `drizzle-orm`, `drizzle-kit`, and `@neondatabase/serverless`.
* Use `@clerk/nextjs`.
* Use `@tanstack/react-query`.
* Use `zod`.
* Use `@upstash/qstash`.
* Use `temporal-polyfill`.
* Use `nanoid` if needed for public slugs.
* Use `lucide-react` for icons.
* Use shadcn/ui components for forms, dialogs, cards, tables, buttons, badges, dropdowns, toasts, and layout.

Product concept:

Authenticated users are managers. Managers belong to an organization/workspace. Managers can create standup form templates. A template has ordered custom questions like:

* What did you work on yesterday?
* What are you working on today?
* Any blockers?
* Anything you need from the team?

Managers can manually start a standup session from a template. They can also create a recurring standup schedule from a template. A session has a public link. Employees do not create accounts. Employees open the public link, enter name and email, answer the questions, and submit. If the same email submits multiple times to the same session, the manager dashboard should show only the latest submission for that email, while preserving historical submissions in the database.

Core MVP 0.1 features:

1. Manager authentication
2. Organization/workspace support
3. Template creation/editing/deletion
4. Ordered template questions
5. Manual standup session creation from a template
6. Public standup submission page
7. Latest-response-per-email behavior
8. Manager dashboard for viewing responses
9. Close/reopen session
10. Past sessions list
11. Recurring standup schedules
12. Dynamic QStash schedule creation for recurring standups
13. Automatic closing after a configured duration
14. TanStack Query polling every 30 seconds on the manager session response page
15. Clean SaaS-style UI

Do not implement Slack, Microsoft Teams, billing, AI summaries, or email reminders yet. Design the database in a way that those can be added later.

App naming:

Use a temporary product name like “AsyncStand” throughout the UI.

Routes:

Public routes:

* `/`

  * Marketing landing page.
  * Explain async standups.
  * Buttons for sign in and dashboard.

* `/s/[publicSlug]`

  * Public standup form.
  * No auth required.
  * If session is closed, show “This standup is closed.”
  * If session is open, ask for name, email, and answers.
  * Validate required fields.
  * On submit, create/update participant and create a new submission.
  * Redirect to `/s/[publicSlug]/submitted`.

* `/s/[publicSlug]/submitted`

  * Thank-you page.
  * Mention that they can resubmit using the same link and email while the standup remains open.

Authenticated manager routes:

* `/dashboard`

  * Overview page.
  * Show active/open sessions.
  * Show recent sessions.
  * Show templates.
  * Show recurring schedules.

* `/dashboard/templates`

  * List templates.
  * Button to create template.

* `/dashboard/templates/new`

  * Create template form.
  * Template title, description, questions.
  * Questions should be addable/removable/reorderable.
  * For MVP, support `textarea` question type only, but structure database to allow more types later.
  * Each question has text, required flag, and sort order.

* `/dashboard/templates/[templateId]/edit`

  * Edit template.
  * Allow editing title, description, and questions.

* `/dashboard/templates/[templateId]/start`

  * Start manual session from template.
  * Fields:

    * session title
    * optional close duration in minutes
  * On create, snapshot template questions into session questions.
  * Generate secure public slug.
  * Session starts as open.
  * If close duration is set, schedule a delayed QStash close job for that session.
  * Redirect to session detail page.

* `/dashboard/sessions`

  * List all sessions.
  * Filters: open, closed, all.

* `/dashboard/sessions/[sessionId]`

  * Session detail dashboard.
  * Show title, status, public link, copy link button, created/opened/closed timestamps.
  * Show response count.
  * Show latest responses by participant email only.
  * Use TanStack Query with `refetchInterval: 30000` for latest responses.
  * Allow manual close/reopen.
  * If session is open, show close button.
  * If closed, show reopen button.
  * Public respondents cannot access this page.

* `/dashboard/schedules`

  * List recurring standup schedules.
  * Show template name, recurrence, local open time, close duration, active/inactive status, next run info if easy.
  * Actions: create, pause, resume, delete.

* `/dashboard/schedules/new`

  * Create recurring schedule from a template.
  * Fields:

    * schedule name
    * template
    * recurrence type: daily, weekdays, custom selected days
    * selected weekdays if custom
    * local open time
    * timezone, default to browser timezone
    * close after duration in minutes
    * session title format, default: `{templateTitle} — {date}`
    * active boolean
  * On save, create database row and create a QStash recurring schedule dynamically.

* `/dashboard/schedules/[scheduleId]/edit`

  * Edit recurring schedule.
  * If recurrence changes, update the QStash schedule. Prefer overwriting with a deterministic schedule ID.

Required database schema:

Use Drizzle with Postgres.

Tables:

1. `users`

Fields:

* `id` uuid primary key default random
* `clerk_user_id` text unique not null
* `email` text not null
* `name` text
* `created_at` timestamp not null default now
* `updated_at` timestamp not null default now

2. `organizations`

Fields:

* `id` uuid primary key default random
* `clerk_org_id` text unique nullable
* `name` text not null
* `slug` text unique nullable
* `created_at` timestamp not null default now
* `updated_at` timestamp not null default now

3. `organization_members`

Fields:

* `id` uuid primary key default random
* `organization_id` uuid references organizations(id) on delete cascade
* `user_id` uuid references users(id) on delete cascade
* `role` text not null default `manager`
* `created_at` timestamp not null default now

Constraints:

* unique `(organization_id, user_id)`

Allowed roles for MVP:

* owner
* manager
* viewer

4. `standup_templates`

Fields:

* `id` uuid primary key default random
* `organization_id` uuid references organizations(id) on delete cascade
* `created_by_user_id` uuid references users(id) on delete set null
* `title` text not null
* `description` text nullable
* `is_active` boolean not null default true
* `created_at` timestamp not null default now
* `updated_at` timestamp not null default now

5. `template_questions`

Fields:

* `id` uuid primary key default random
* `template_id` uuid references standup_templates(id) on delete cascade
* `question_text` text not null
* `question_type` text not null default `textarea`
* `is_required` boolean not null default true
* `sort_order` integer not null
* `options` jsonb nullable
* `created_at` timestamp not null default now
* `updated_at` timestamp not null default now

6. `standup_sessions`

Fields:

* `id` uuid primary key default random
* `organization_id` uuid references organizations(id) on delete cascade
* `template_id` uuid references standup_templates(id) on delete set null
* `created_by_user_id` uuid references users(id) on delete set null
* `recurring_schedule_id` uuid references recurring_standup_schedules(id) on delete set null, nullable
* `title` text not null
* `status` text not null default `open`
* `public_slug` text unique not null
* `opened_at` timestamp not null default now
* `scheduled_close_at` timestamp nullable
* `closed_at` timestamp nullable
* `close_qstash_message_id` text nullable
* `created_at` timestamp not null default now
* `updated_at` timestamp not null default now

Allowed statuses:

* open
* closed

7. `standup_session_questions`

Fields:

* `id` uuid primary key default random
* `session_id` uuid references standup_sessions(id) on delete cascade
* `original_template_question_id` uuid references template_questions(id) on delete set null
* `question_text` text not null
* `question_type` text not null default `textarea`
* `is_required` boolean not null default true
* `sort_order` integer not null
* `options` jsonb nullable
* `created_at` timestamp not null default now

Important:

When creating a standup session, always snapshot current template questions into this table. Past sessions should not change if the template is edited later.

8. `standup_participants`

Fields:

* `id` uuid primary key default random
* `session_id` uuid references standup_sessions(id) on delete cascade
* `name` text not null
* `email` text not null
* `normalized_email` text not null
* `latest_submission_id` uuid nullable
* `created_at` timestamp not null default now
* `updated_at` timestamp not null default now

Constraints:

* unique `(session_id, normalized_email)`

Important:

Normalize emails by trimming and lowercasing before storing.

9. `standup_submissions`

Fields:

* `id` uuid primary key default random
* `session_id` uuid references standup_sessions(id) on delete cascade
* `participant_id` uuid references standup_participants(id) on delete cascade
* `submitted_at` timestamp not null default now
* `user_agent` text nullable
* `ip_hash` text nullable
* `created_at` timestamp not null default now

Important:

Keep every submission. Do not delete old submissions when the same email resubmits.

10. `standup_answers`

Fields:

* `id` uuid primary key default random
* `submission_id` uuid references standup_submissions(id) on delete cascade
* `session_question_id` uuid references standup_session_questions(id) on delete cascade
* `answer_text` text nullable
* `answer_json` jsonb nullable
* `created_at` timestamp not null default now

Constraints:

* unique `(submission_id, session_question_id)`

11. `recurring_standup_schedules`

Fields:

* `id` uuid primary key default random
* `organization_id` uuid references organizations(id) on delete cascade
* `template_id` uuid references standup_templates(id) on delete cascade
* `created_by_user_id` uuid references users(id) on delete set null
* `name` text not null
* `status` text not null default `active`
* `recurrence_type` text not null
* `weekdays` integer array nullable
* `local_time` text not null
* `timezone` text not null
* `cron_expression` text not null
* `qstash_schedule_id` text unique nullable
* `close_after_minutes` integer not null
* `session_title_format` text not null default `{templateTitle} — {date}`
* `last_run_at` timestamp nullable
* `next_run_at` timestamp nullable
* `created_at` timestamp not null default now
* `updated_at` timestamp not null default now

Allowed status values:

* active
* paused
* deleted

Allowed recurrence types:

* daily
* weekdays
* custom

Weekday format:

* Store weekdays as integers using cron-compatible day of week:

  * 0 = Sunday
  * 1 = Monday
  * 2 = Tuesday
  * 3 = Wednesday
  * 4 = Thursday
  * 5 = Friday
  * 6 = Saturday

Examples:

* daily: weekdays can be null, cron day-of-week is `*`
* weekdays: weekdays is `[1,2,3,4,5]`
* custom Monday/Wednesday/Friday: weekdays is `[1,3,5]`

Cron behavior:

Use Upstash QStash schedules. Create schedules dynamically when a manager creates a recurring standup configuration. Use the QStash SDK.

Use cron expressions with timezone prefix:

* `CRON_TZ=America/New_York 0 9 * * 1,3,5`

This means 9:00 AM on Monday, Wednesday, and Friday in New York time.

Important:

The recurring QStash schedule should call an internal API endpoint that creates a new standup session from the configured template. That endpoint should also schedule a delayed QStash message to close that specific session after `close_after_minutes`.

Do not create a separate recurring close cron. Instead:

1. QStash recurring schedule fires.
2. `/api/qstash/open-recurring-standup` receives schedule ID.
3. The endpoint validates the QStash signature.
4. It loads the recurring schedule from the database.
5. If schedule is inactive, paused, or deleted, do nothing.
6. It creates a new standup session by snapshotting template questions.
7. It schedules a one-off delayed QStash message to `/api/qstash/close-standup-session` with the new session ID and close time.
8. It updates `last_run_at`, optionally `next_run_at`, and stores the close message ID on the session if available.

QStash endpoints:

Create these API routes:

1. `POST /api/qstash/open-recurring-standup`

Body:

```json
{
  "recurringScheduleId": "uuid"
}
```

Behavior:

* Verify QStash signature.
* Find schedule by ID.
* Ensure schedule status is `active`.
* Ensure organization and template still exist.
* Create a standup session from the template.
* Generate a secure public slug.
* Snapshot template questions.
* Set `recurring_schedule_id`.
* Set title using `session_title_format`.
* Use Temporal to format local date in schedule timezone.
* Set `scheduled_close_at`.
* Publish delayed QStash message to close the session.
* Save delayed close message ID if available.
* Return JSON with created session ID.

2. `POST /api/qstash/close-standup-session`

Body:

```json
{
  "sessionId": "uuid"
}
```

Behavior:

* Verify QStash signature.
* Find session.
* If session is already closed, return success idempotently.
* Set status to `closed`.
* Set `closed_at` to now.
* Return success.

3. `POST /api/schedules`

Authenticated manager route.

Behavior:

* Validate input with Zod.
* Confirm manager belongs to organization.
* Create recurring schedule row in database.
* Build cron expression.
* Create QStash schedule with deterministic schedule ID like `recurring-standup-${scheduleId}`.
* Store returned or deterministic QStash schedule ID.
* Return schedule.

4. `PATCH /api/schedules/[scheduleId]`

Authenticated manager route.

Behavior:

* Validate manager access.
* Update schedule config.
* Rebuild cron expression.
* Overwrite/update QStash schedule using same deterministic schedule ID.
* Save updated cron expression.

5. `POST /api/schedules/[scheduleId]/pause`

Authenticated manager route.

Behavior:

* Validate manager access.
* Mark schedule as paused.
* Delete or disable QStash schedule if supported.
* If easier for MVP, delete QStash schedule and recreate on resume.
* Make sure paused schedules do not create sessions even if an old QStash message arrives.

6. `POST /api/schedules/[scheduleId]/resume`

Authenticated manager route.

Behavior:

* Validate manager access.
* Mark schedule as active.
* Recreate QStash schedule if needed.

7. `DELETE /api/schedules/[scheduleId]`

Authenticated manager route.

Behavior:

* Validate manager access.
* Mark as deleted.
* Delete QStash schedule if possible.
* Do not hard delete unless simple.

Security:

* All dashboard and manager API routes require Clerk auth.
* Public `/s/[publicSlug]` does not require auth.
* Public respondents can only submit answers. They cannot view manager dashboard or other responses.
* Managers can only access organizations they belong to.
* All queries must filter by `organization_id`.
* Never trust client-provided organization ID without checking membership.
* Public slugs must be unguessable.
* Closed sessions must reject submissions.
* QStash webhook routes must verify signatures.
* Add rate limiting placeholders or TODO comments for public submission endpoints.
* Add basic server-side validation with Zod for all mutations.
* Hash IP before storing if storing IP data. If not implementing hash, leave `ip_hash` null.

Date/time handling:

Use `temporal-polyfill`.

Rules:

* Store timestamps in Postgres as UTC.
* Store recurring schedule local time as `"HH:mm"`.
* Store timezone as an IANA timezone string like `"America/New_York"`.
* Use Temporal for:

  * formatting session titles from local date
  * calculating scheduled close time
  * validating local time
  * deriving display strings

Example title format behavior:

Template title: `Engineering Daily Standup`
Format: `{templateTitle} — {date}`
Date in timezone America/New_York on June 20, 2026.
Result: `Engineering Daily Standup — Jun 20, 2026`

Cron generation:

Implement helper:

```ts
function buildCronExpression(input: {
  recurrenceType: "daily" | "weekdays" | "custom";
  weekdays?: number[];
  localTime: string; // HH:mm
  timezone: string;
}): string
```

Behavior:

* Parse localTime into hour/minute.
* daily -> `CRON_TZ=${timezone} ${minute} ${hour} * * *`
* weekdays -> `CRON_TZ=${timezone} ${minute} ${hour} * * 1,2,3,4,5`
* custom -> `CRON_TZ=${timezone} ${minute} ${hour} * * ${weekdays.join(",")}`

Validate:

* timezone is non-empty
* localTime matches HH:mm
* hour 0–23
* minute 0–59
* weekdays are 0–6
* custom requires at least one weekday
* close_after_minutes must be between 5 and 1440

Manual session behavior:

Implement route or server action to create a manual session from a template.

Input:

* templateId
* title
* closeAfterMinutes optional

Behavior:

* Validate manager access.
* Create standup session with status open.
* Snapshot questions.
* Generate public slug.
* If closeAfterMinutes is provided, publish a delayed QStash message to close the session.
* Store `scheduled_close_at` and close message ID if available.

Submission behavior:

Public form submission:

Input:

* publicSlug
* name
* email
* answers keyed by sessionQuestionId

Behavior:

* Find session by publicSlug.
* If not found, show 404.
* If closed, reject submission.
* Normalize email by trim/lowercase.
* Upsert participant by `(session_id, normalized_email)`.
* Update participant name/email if they resubmit.
* Create new submission.
* Insert answers.
* Update participant.latest_submission_id to new submission ID.
* Return success.

Latest response dashboard query:

Manager session detail should query participants and their latest submissions:

* Load session by ID and organization.
* Load session questions ordered by sort_order.
* Load participants where latest_submission_id is not null.
* Join latest submission and answers.
* Return rows:

  * participant name
  * participant email
  * submitted_at
  * answers by question
* Sort newest first or name ascending. Prefer newest first for MVP.

Use TanStack Query:

* Wrap app in QueryClientProvider.
* On session detail page, fetch latest responses using `useQuery`.
* Query key: `["session", sessionId, "responses"]`.
* Set `refetchInterval: 30000`.
* Use mutations for close/reopen and invalidate relevant queries after success.
* Use optimistic UI only if simple.

UI requirements:

Use a clean SaaS dashboard style.

Global layout:

* Sidebar with:

  * Dashboard
  * Templates
  * Sessions
  * Recurring Schedules
  * Settings
* Top bar with organization name and user menu.
* Mobile responsive enough for basic use.

Landing page:

* Hero: “Async standups without the Slack chaos.”
* Subtitle: “Create a standup form, share a link, and see clean latest updates from your team.”
* CTA: “Get started”
* Secondary CTA: “Sign in”

Template editor:

* Use cards for questions.
* Add question button.
* Remove question button.
* Move up/down buttons.
* Required toggle.
* Save button.

Session dashboard:

* Header:

  * title
  * open/closed badge
  * public link
  * copy button
  * close/reopen button
* Stats:

  * response count
  * opened at
  * scheduled close time if present
  * closed at if present
* Responses table:

  * participant
  * email
  * submitted
  * answers
* Empty state:

  * “No responses yet. Share the public link with your team.”

Recurring schedule UI:

Create form fields:

* Schedule name
* Template dropdown
* Recurrence type dropdown:

  * Daily
  * Weekdays
  * Custom days
* If custom, checkboxes for Sun–Sat
* Local open time input
* Timezone input/select, default from browser
* Close after minutes
* Session title format
* Active toggle
* Save button

Schedule list:

* Name
* Template
* Recurrence summary
* Open time
* Timezone
* Close after
* Status badge
* Actions: edit, pause/resume, delete

Implementation details:

Project structure suggestion:

```txt
src/
  app/
    page.tsx
    dashboard/
      layout.tsx
      page.tsx
      templates/
      sessions/
      schedules/
    s/
      [publicSlug]/
        page.tsx
        submitted/
          page.tsx
    api/
      templates/
      sessions/
      schedules/
      public/
        standup-submit/
      qstash/
        open-recurring-standup/
        close-standup-session/
  components/
    ui/
    dashboard/
    forms/
  db/
    index.ts
    schema.ts
    queries/
  lib/
    auth.ts
    qstash.ts
    temporal.ts
    cron.ts
    validation.ts
    slugs.ts
    email.ts
  hooks/
    use-session-responses.ts
```

Environment variables:

```txt
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
NEXT_PUBLIC_APP_URL=
```

Use `NEXT_PUBLIC_APP_URL` for QStash destination URLs. Example:

```ts
const destination = `${process.env.NEXT_PUBLIC_APP_URL}/api/qstash/open-recurring-standup`;
```

QStash helper:

Create `lib/qstash.ts`.

It should export:

* `qstashClient`
* `createRecurringOpenSchedule`
* `deleteRecurringSchedule`
* `publishDelayedCloseSession`
* `verifyQstashRequest`

The exact QStash SDK API may vary, so follow the official `@upstash/qstash` SDK docs. Use `client.schedules.create` for recurring schedules. Use `client.publishJSON` or the current SDK equivalent for delayed one-off close jobs.

For QStash schedule creation:

* Destination: `/api/qstash/open-recurring-standup`
* Body: `{ recurringScheduleId }`
* Cron: generated cron expression with `CRON_TZ=...`
* scheduleId: `recurring-standup-${scheduleId}`

For delayed close:

* Destination: `/api/qstash/close-standup-session`
* Body: `{ sessionId }`
* Delay: closeAfterMinutes converted to seconds or duration format according to SDK.
* Store returned message ID if available.

Idempotency:

QStash jobs can retry. Make open and close endpoints safe.

For close endpoint:

* If session is already closed, return `{ ok: true, alreadyClosed: true }`.

For open recurring endpoint:

* Add basic idempotency protection to avoid duplicate sessions if QStash retries.
* Create a table if needed:

12. `recurring_schedule_runs`

Fields:

* `id` uuid primary key default random
* `recurring_schedule_id` uuid references recurring_standup_schedules(id) on delete cascade
* `scheduled_for_key` text not null
* `session_id` uuid references standup_sessions(id) on delete set null
* `status` text not null default `created`
* `created_at` timestamp not null default now

Constraint:

* unique `(recurring_schedule_id, scheduled_for_key)`

In `/api/qstash/open-recurring-standup`, compute `scheduled_for_key` using the current date/time rounded to the scheduled minute in the schedule timezone, for example `2026-06-20T09:00[America/New_York]`. Before creating a session, try to insert a run row. If unique conflict occurs, return success without creating another session.

If this is too complex for first pass, implement the table and use a reasonable key based on the request time in the schedule timezone.

Zod schemas:

Create schemas for:

* create template
* update template
* create manual session
* public submission
* create recurring schedule
* update recurring schedule
* close/reopen session

Validation examples:

Template:

* title required, max 120 chars
* description max 1000 chars
* at least one question
* question text required, max 500 chars

Public submission:

* name required, max 120 chars
* email valid email
* answers object required
* required questions must have non-empty answers

Recurring schedule:

* name required
* templateId uuid
* recurrenceType enum
* weekdays array optional
* localTime HH:mm
* timezone required
* closeAfterMinutes min 5 max 1440
* sessionTitleFormat required

Access control:

Create helper functions:

* `getCurrentUserOrThrow()`
* `getCurrentOrganizationOrThrow()`
* `assertUserCanAccessOrganization(userId, organizationId)`
* `assertTemplateAccess(templateId)`
* `assertSessionAccess(sessionId)`
* `assertScheduleAccess(scheduleId)`

If Clerk Organizations are active, map the Clerk org ID to internal organizations. On first dashboard load, upsert user and organization.

MVP simplification:

If Clerk org creation is too much, create a default organization per user on first login. Still keep organization tables so the app is multi-tenant-ready.

Important business logic:

1. Editing a template does not affect existing sessions.
2. Closed sessions reject public submissions.
3. Public link respondents never need accounts.
4. Same email in same session updates visible latest response.
5. Historical submissions are preserved.
6. Managers see only their organization’s data.
7. Recurring schedules create future sessions automatically.
8. A recurring schedule can be paused without deleting history.
9. Auto-close jobs should not fail if the session was manually closed already.
10. Manual close should override scheduled close.

Database indexes:

Add indexes for:

* `standup_sessions.organization_id`
* `standup_sessions.public_slug`
* `standup_sessions.status`
* `standup_templates.organization_id`
* `template_questions.template_id`
* `standup_session_questions.session_id`
* `standup_participants.session_id`
* `standup_participants.normalized_email`
* `standup_submissions.session_id`
* `standup_submissions.participant_id`
* `standup_answers.submission_id`
* `recurring_standup_schedules.organization_id`
* `recurring_standup_schedules.status`

Expected deliverables:

1. Complete Next.js project code.
2. Drizzle schema.
3. Drizzle migration setup.
4. Seed script if helpful.
5. Clerk auth middleware.
6. Dashboard UI.
7. Public standup form.
8. Template CRUD.
9. Session CRUD.
10. Recurring schedule CRUD.
11. QStash open recurring endpoint.
12. QStash close session endpoint.
13. TanStack Query provider and polling dashboard.
14. Zod validation.
15. Clear README with setup steps.

README must include:

* Required environment variables
* How to run locally
* How to run Drizzle migrations
* How to configure Clerk
* How to configure Neon
* How to configure Upstash QStash
* How QStash scheduling works
* How recurring standups are created and closed
* Known limitations

Use polished but simple UI. Prioritize correctness and clean architecture over excessive features.

Do not implement:

* Billing
* AI summaries
* Slack integration
* Teams integration
* Email reminders
* Employee accounts
* Advanced analytics
* SOC2/compliance materials

Build this as a strong version 0.1 MVP that is easy to extend into a B2B SaaS.
