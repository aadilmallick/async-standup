import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// NOTE: `casing: "snake_case"` in drizzle.config.ts maps camelCase property
// names to snake_case column names automatically. Timestamps are stored as
// timestamptz (UTC) per the date/time rules in the spec.

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

// 1. users
export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  clerkUserId: text().notNull().unique(),
  email: text().notNull(),
  name: text(),
  ...timestamps,
});

// 2. organizations
export const organizations = pgTable("organizations", {
  id: uuid().primaryKey().defaultRandom(),
  clerkOrgId: text().unique(),
  name: text().notNull(),
  slug: text().unique(),
  ...timestamps,
});

// 3. organization_members
export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Allowed roles: owner | manager | viewer
    role: text().notNull().default("manager"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("organization_members_org_user_unique").on(
      t.organizationId,
      t.userId
    ),
    index("organization_members_user_idx").on(t.userId),
  ]
);

// 4. standup_templates
export const standupTemplates = pgTable(
  "standup_templates",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: uuid().references(() => users.id, {
      onDelete: "set null",
    }),
    title: text().notNull(),
    description: text(),
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [index("standup_templates_org_idx").on(t.organizationId)]
);

// 5. template_questions
export const templateQuestions = pgTable(
  "template_questions",
  {
    id: uuid().primaryKey().defaultRandom(),
    templateId: uuid()
      .notNull()
      .references(() => standupTemplates.id, { onDelete: "cascade" }),
    questionText: text().notNull(),
    // Only `textarea` for MVP; column allows future types.
    questionType: text().notNull().default("textarea"),
    isRequired: boolean().notNull().default(true),
    sortOrder: integer().notNull(),
    options: jsonb(),
    ...timestamps,
  },
  (t) => [index("template_questions_template_idx").on(t.templateId)]
);

// 11. recurring_standup_schedules (defined before sessions: sessions FK -> schedules)
export const recurringStandupSchedules = pgTable(
  "recurring_standup_schedules",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateId: uuid()
      .notNull()
      .references(() => standupTemplates.id, { onDelete: "cascade" }),
    createdByUserId: uuid().references(() => users.id, {
      onDelete: "set null",
    }),
    name: text().notNull(),
    // Allowed status: active | paused | deleted
    status: text().notNull().default("active"),
    // Allowed recurrence: daily | weekdays | custom
    recurrenceType: text().notNull(),
    // Cron-compatible day-of-week ints (0=Sun..6=Sat)
    weekdays: integer().array(),
    localTime: text().notNull(), // "HH:mm"
    timezone: text().notNull(), // IANA tz
    cronExpression: text().notNull(),
    qstashScheduleId: text().unique(),
    closeAfterMinutes: integer().notNull(),
    sessionTitleFormat: text().notNull().default("{templateTitle} — {date}"),
    lastRunAt: timestamp({ withTimezone: true }),
    nextRunAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("recurring_schedules_org_idx").on(t.organizationId),
    index("recurring_schedules_status_idx").on(t.status),
  ]
);

// 6. standup_sessions
export const standupSessions = pgTable(
  "standup_sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateId: uuid().references(() => standupTemplates.id, {
      onDelete: "set null",
    }),
    createdByUserId: uuid().references(() => users.id, {
      onDelete: "set null",
    }),
    recurringScheduleId: uuid().references(
      () => recurringStandupSchedules.id,
      { onDelete: "set null" }
    ),
    title: text().notNull(),
    // Allowed status: open | closed
    status: text().notNull().default("open"),
    publicSlug: text().notNull().unique(),
    openedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    scheduledCloseAt: timestamp({ withTimezone: true }),
    closedAt: timestamp({ withTimezone: true }),
    closeQstashMessageId: text(),
    ...timestamps,
  },
  (t) => [
    index("standup_sessions_org_idx").on(t.organizationId),
    index("standup_sessions_public_slug_idx").on(t.publicSlug),
    index("standup_sessions_status_idx").on(t.status),
  ]
);

// 7. standup_session_questions (snapshot of template questions)
export const standupSessionQuestions = pgTable(
  "standup_session_questions",
  {
    id: uuid().primaryKey().defaultRandom(),
    sessionId: uuid()
      .notNull()
      .references(() => standupSessions.id, { onDelete: "cascade" }),
    originalTemplateQuestionId: uuid().references(() => templateQuestions.id, {
      onDelete: "set null",
    }),
    questionText: text().notNull(),
    questionType: text().notNull().default("textarea"),
    isRequired: boolean().notNull().default(true),
    sortOrder: integer().notNull(),
    options: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("session_questions_session_idx").on(t.sessionId)]
);

// 8. standup_participants
export const standupParticipants = pgTable(
  "standup_participants",
  {
    id: uuid().primaryKey().defaultRandom(),
    sessionId: uuid()
      .notNull()
      .references(() => standupSessions.id, { onDelete: "cascade" }),
    name: text().notNull(),
    email: text().notNull(),
    normalizedEmail: text().notNull(),
    // No FK (avoids participant<->submission cycle); set after each submission.
    latestSubmissionId: uuid(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("participants_session_email_unique").on(
      t.sessionId,
      t.normalizedEmail
    ),
    index("participants_session_idx").on(t.sessionId),
    index("participants_normalized_email_idx").on(t.normalizedEmail),
  ]
);

// 9. standup_submissions (every submission preserved)
export const standupSubmissions = pgTable(
  "standup_submissions",
  {
    id: uuid().primaryKey().defaultRandom(),
    sessionId: uuid()
      .notNull()
      .references(() => standupSessions.id, { onDelete: "cascade" }),
    participantId: uuid()
      .notNull()
      .references(() => standupParticipants.id, { onDelete: "cascade" }),
    submittedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    userAgent: text(),
    ipHash: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("submissions_session_idx").on(t.sessionId),
    index("submissions_participant_idx").on(t.participantId),
  ]
);

// 10. standup_answers
export const standupAnswers = pgTable(
  "standup_answers",
  {
    id: uuid().primaryKey().defaultRandom(),
    submissionId: uuid()
      .notNull()
      .references(() => standupSubmissions.id, { onDelete: "cascade" }),
    sessionQuestionId: uuid()
      .notNull()
      .references(() => standupSessionQuestions.id, { onDelete: "cascade" }),
    answerText: text(),
    answerJson: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("answers_submission_question_unique").on(
      t.submissionId,
      t.sessionQuestionId
    ),
    index("answers_submission_idx").on(t.submissionId),
  ]
);

// 12. recurring_schedule_runs (idempotency for QStash open jobs)
export const recurringScheduleRuns = pgTable(
  "recurring_schedule_runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    recurringScheduleId: uuid()
      .notNull()
      .references(() => recurringStandupSchedules.id, { onDelete: "cascade" }),
    scheduledForKey: text().notNull(),
    sessionId: uuid().references(() => standupSessions.id, {
      onDelete: "set null",
    }),
    status: text().notNull().default("created"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("schedule_runs_schedule_key_unique").on(
      t.recurringScheduleId,
      t.scheduledForKey
    ),
  ]
);

// ── Inferred types ──────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type StandupTemplate = typeof standupTemplates.$inferSelect;
export type TemplateQuestion = typeof templateQuestions.$inferSelect;
export type StandupSession = typeof standupSessions.$inferSelect;
export type StandupSessionQuestion = typeof standupSessionQuestions.$inferSelect;
export type StandupParticipant = typeof standupParticipants.$inferSelect;
export type StandupSubmission = typeof standupSubmissions.$inferSelect;
export type StandupAnswer = typeof standupAnswers.$inferSelect;
export type RecurringStandupSchedule =
  typeof recurringStandupSchedules.$inferSelect;
