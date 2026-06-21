import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  recurringStandupSchedules,
  standupAnswers,
  standupParticipants,
  standupSessionQuestions,
  standupSessions,
  standupSubmissions,
  standupTemplates,
  templateQuestions,
  type RecurringStandupSchedule,
  type StandupSession,
  type StandupSessionQuestion,
  type StandupTemplate,
  type TemplateQuestion,
} from "@/db/schema";

// ── Templates ────────────────────────────────────────────────────────────────
export async function listTemplates(
  organizationId: string
): Promise<(StandupTemplate & { questionCount: number })[]> {
  const rows = await db
    .select({
      template: standupTemplates,
      questionCount: sql<number>`count(${templateQuestions.id})::int`,
    })
    .from(standupTemplates)
    .leftJoin(
      templateQuestions,
      eq(templateQuestions.templateId, standupTemplates.id)
    )
    .where(eq(standupTemplates.organizationId, organizationId))
    .groupBy(standupTemplates.id)
    .orderBy(desc(standupTemplates.updatedAt));

  return rows.map((r) => ({ ...r.template, questionCount: r.questionCount }));
}

export async function getTemplateWithQuestions(
  templateId: string,
  organizationId: string
): Promise<{ template: StandupTemplate; questions: TemplateQuestion[] } | null> {
  const template = await db
    .select()
    .from(standupTemplates)
    .where(
      and(
        eq(standupTemplates.id, templateId),
        eq(standupTemplates.organizationId, organizationId)
      )
    )
    .limit(1);
  if (!template[0]) return null;

  const questions = await db
    .select()
    .from(templateQuestions)
    .where(eq(templateQuestions.templateId, templateId))
    .orderBy(templateQuestions.sortOrder);

  return { template: template[0], questions };
}

// ── Sessions ─────────────────────────────────────────────────────────────────
export type SessionStatusFilter = "open" | "closed" | "all";

export async function listSessions(
  organizationId: string,
  filter: SessionStatusFilter = "all"
): Promise<(StandupSession & { responseCount: number })[]> {
  const conditions = [eq(standupSessions.organizationId, organizationId)];
  if (filter === "open" || filter === "closed") {
    conditions.push(eq(standupSessions.status, filter));
  }

  const rows = await db
    .select({
      session: standupSessions,
      responseCount: sql<number>`count(distinct ${standupParticipants.id}) filter (where ${standupParticipants.latestSubmissionId} is not null)::int`,
    })
    .from(standupSessions)
    .leftJoin(
      standupParticipants,
      eq(standupParticipants.sessionId, standupSessions.id)
    )
    .where(and(...conditions))
    .groupBy(standupSessions.id)
    .orderBy(desc(standupSessions.createdAt));

  return rows.map((r) => ({ ...r.session, responseCount: r.responseCount }));
}

export interface SessionResponseRow {
  participantId: string;
  name: string;
  email: string;
  submittedAt: Date;
  answers: Record<string, string>; // sessionQuestionId -> answerText
}

export interface SessionResponsesResult {
  questions: StandupSessionQuestion[];
  responses: SessionResponseRow[];
  responseCount: number;
}

/**
 * Loads the latest response per participant email for a session, with answers
 * keyed by session question id. Sorted newest first.
 */
export async function getSessionResponses(
  sessionId: string
): Promise<SessionResponsesResult> {
  const questions = await db
    .select()
    .from(standupSessionQuestions)
    .where(eq(standupSessionQuestions.sessionId, sessionId))
    .orderBy(standupSessionQuestions.sortOrder);

  const participants = await db
    .select()
    .from(standupParticipants)
    .where(
      and(
        eq(standupParticipants.sessionId, sessionId),
        isNotNull(standupParticipants.latestSubmissionId)
      )
    );

  if (participants.length === 0) {
    return { questions, responses: [], responseCount: 0 };
  }

  const submissionIds = participants
    .map((p) => p.latestSubmissionId)
    .filter((id): id is string => Boolean(id));

  const submissions = await db
    .select()
    .from(standupSubmissions)
    .where(inArray(standupSubmissions.id, submissionIds));
  const submissionById = new Map(submissions.map((s) => [s.id, s]));

  const answers = await db
    .select()
    .from(standupAnswers)
    .where(inArray(standupAnswers.submissionId, submissionIds));
  const answersBySubmission = new Map<string, Record<string, string>>();
  for (const a of answers) {
    const map = answersBySubmission.get(a.submissionId) ?? {};
    map[a.sessionQuestionId] = a.answerText ?? "";
    answersBySubmission.set(a.submissionId, map);
  }

  const responses: SessionResponseRow[] = participants
    .map((p) => {
      const submission = submissionById.get(p.latestSubmissionId!);
      return {
        participantId: p.id,
        name: p.name,
        email: p.email,
        submittedAt: submission?.submittedAt ?? p.updatedAt,
        answers: answersBySubmission.get(p.latestSubmissionId!) ?? {},
      };
    })
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

  return { questions, responses, responseCount: responses.length };
}

// ── Schedules ────────────────────────────────────────────────────────────────
export async function listSchedules(
  organizationId: string
): Promise<(RecurringStandupSchedule & { templateTitle: string | null })[]> {
  const rows = await db
    .select({
      schedule: recurringStandupSchedules,
      templateTitle: standupTemplates.title,
    })
    .from(recurringStandupSchedules)
    .leftJoin(
      standupTemplates,
      eq(standupTemplates.id, recurringStandupSchedules.templateId)
    )
    .where(
      and(
        eq(recurringStandupSchedules.organizationId, organizationId),
        sql`${recurringStandupSchedules.status} != 'deleted'`
      )
    )
    .orderBy(desc(recurringStandupSchedules.createdAt));

  return rows.map((r) => ({ ...r.schedule, templateTitle: r.templateTitle }));
}
