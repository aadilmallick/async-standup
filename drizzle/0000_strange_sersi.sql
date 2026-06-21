CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'manager' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" text,
	"name" text NOT NULL,
	"slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_clerkOrgId_unique" UNIQUE("clerk_org_id"),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "recurring_schedule_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recurring_schedule_id" uuid NOT NULL,
	"scheduled_for_key" text NOT NULL,
	"session_id" uuid,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_standup_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"recurrence_type" text NOT NULL,
	"weekdays" integer[],
	"local_time" text NOT NULL,
	"timezone" text NOT NULL,
	"cron_expression" text NOT NULL,
	"qstash_schedule_id" text,
	"close_after_minutes" integer NOT NULL,
	"session_title_format" text DEFAULT '{templateTitle} — {date}' NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_standup_schedules_qstashScheduleId_unique" UNIQUE("qstash_schedule_id")
);
--> statement-breakpoint
CREATE TABLE "standup_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"session_question_id" uuid NOT NULL,
	"answer_text" text,
	"answer_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standup_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"latest_submission_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standup_session_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"original_template_question_id" uuid,
	"question_text" text NOT NULL,
	"question_type" text DEFAULT 'textarea' NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"options" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standup_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"template_id" uuid,
	"created_by_user_id" uuid,
	"recurring_schedule_id" uuid,
	"title" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"public_slug" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_close_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"close_qstash_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "standup_sessions_publicSlug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
CREATE TABLE "standup_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standup_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"question_type" text DEFAULT 'textarea' NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"options" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerkUserId_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedule_runs" ADD CONSTRAINT "recurring_schedule_runs_recurring_schedule_id_recurring_standup_schedules_id_fk" FOREIGN KEY ("recurring_schedule_id") REFERENCES "public"."recurring_standup_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedule_runs" ADD CONSTRAINT "recurring_schedule_runs_session_id_standup_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."standup_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_standup_schedules" ADD CONSTRAINT "recurring_standup_schedules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_standup_schedules" ADD CONSTRAINT "recurring_standup_schedules_template_id_standup_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."standup_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_standup_schedules" ADD CONSTRAINT "recurring_standup_schedules_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_answers" ADD CONSTRAINT "standup_answers_submission_id_standup_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."standup_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_answers" ADD CONSTRAINT "standup_answers_session_question_id_standup_session_questions_id_fk" FOREIGN KEY ("session_question_id") REFERENCES "public"."standup_session_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_participants" ADD CONSTRAINT "standup_participants_session_id_standup_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."standup_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_session_questions" ADD CONSTRAINT "standup_session_questions_session_id_standup_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."standup_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_session_questions" ADD CONSTRAINT "standup_session_questions_original_template_question_id_template_questions_id_fk" FOREIGN KEY ("original_template_question_id") REFERENCES "public"."template_questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_sessions" ADD CONSTRAINT "standup_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_sessions" ADD CONSTRAINT "standup_sessions_template_id_standup_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."standup_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_sessions" ADD CONSTRAINT "standup_sessions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_sessions" ADD CONSTRAINT "standup_sessions_recurring_schedule_id_recurring_standup_schedules_id_fk" FOREIGN KEY ("recurring_schedule_id") REFERENCES "public"."recurring_standup_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_submissions" ADD CONSTRAINT "standup_submissions_session_id_standup_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."standup_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_submissions" ADD CONSTRAINT "standup_submissions_participant_id_standup_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."standup_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_templates" ADD CONSTRAINT "standup_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standup_templates" ADD CONSTRAINT "standup_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_questions" ADD CONSTRAINT "template_questions_template_id_standup_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."standup_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_org_user_unique" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_runs_schedule_key_unique" ON "recurring_schedule_runs" USING btree ("recurring_schedule_id","scheduled_for_key");--> statement-breakpoint
CREATE INDEX "recurring_schedules_org_idx" ON "recurring_standup_schedules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "recurring_schedules_status_idx" ON "recurring_standup_schedules" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "answers_submission_question_unique" ON "standup_answers" USING btree ("submission_id","session_question_id");--> statement-breakpoint
CREATE INDEX "answers_submission_idx" ON "standup_answers" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_session_email_unique" ON "standup_participants" USING btree ("session_id","normalized_email");--> statement-breakpoint
CREATE INDEX "participants_session_idx" ON "standup_participants" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "participants_normalized_email_idx" ON "standup_participants" USING btree ("normalized_email");--> statement-breakpoint
CREATE INDEX "session_questions_session_idx" ON "standup_session_questions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "standup_sessions_org_idx" ON "standup_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "standup_sessions_public_slug_idx" ON "standup_sessions" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "standup_sessions_status_idx" ON "standup_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "submissions_session_idx" ON "standup_submissions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "submissions_participant_idx" ON "standup_submissions" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "standup_templates_org_idx" ON "standup_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "template_questions_template_idx" ON "template_questions" USING btree ("template_id");