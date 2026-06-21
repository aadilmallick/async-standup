import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  standupSessionQuestions,
  standupSessions,
  templateQuestions,
  type StandupSession,
} from "@/db/schema";
import { publishDelayedCloseSession } from "@/lib/qstash";
import { generatePublicSlug } from "@/lib/slugs";
import { computeScheduledCloseAt } from "@/lib/temporal";

export interface CreateSessionParams {
  organizationId: string;
  templateId: string;
  title: string;
  createdByUserId?: string | null;
  recurringScheduleId?: string | null;
  closeAfterMinutes?: number | null;
}

/**
 * Creates an open standup session by snapshotting the template's current
 * questions, generating a public slug, and (optionally) scheduling a delayed
 * QStash close job. Returns the created session.
 *
 * Snapshotting means editing the template later never changes this session.
 */
export async function createSessionFromTemplate(
  params: CreateSessionParams
): Promise<StandupSession> {
  const {
    organizationId,
    templateId,
    title,
    createdByUserId = null,
    recurringScheduleId = null,
    closeAfterMinutes = null,
  } = params;

  const questions = await db
    .select()
    .from(templateQuestions)
    .where(eq(templateQuestions.templateId, templateId))
    .orderBy(templateQuestions.sortOrder);

  const scheduledCloseAt =
    closeAfterMinutes && closeAfterMinutes > 0
      ? computeScheduledCloseAt(closeAfterMinutes)
      : null;

  const inserted = await db
    .insert(standupSessions)
    .values({
      organizationId,
      templateId,
      createdByUserId,
      recurringScheduleId,
      title,
      status: "open",
      publicSlug: generatePublicSlug(),
      scheduledCloseAt,
    })
    .returning();
  const session = inserted[0];

  if (questions.length > 0) {
    await db.insert(standupSessionQuestions).values(
      questions.map((q) => ({
        sessionId: session.id,
        originalTemplateQuestionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        isRequired: q.isRequired,
        sortOrder: q.sortOrder,
        options: q.options,
      }))
    );
  }

  // Schedule the delayed close. A failure here must not abort session
  // creation — the manager can still close manually.
  if (closeAfterMinutes && closeAfterMinutes > 0) {
    try {
      const messageId = await publishDelayedCloseSession({
        sessionId: session.id,
        closeAfterMinutes,
      });
      if (messageId) {
        await db
          .update(standupSessions)
          .set({ closeQstashMessageId: messageId })
          .where(eq(standupSessions.id, session.id));
        session.closeQstashMessageId = messageId;
      }
    } catch (err) {
      console.error("Failed to schedule delayed close:", err);
    }
  }

  return session;
}
