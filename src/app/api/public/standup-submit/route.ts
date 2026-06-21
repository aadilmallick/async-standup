import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  standupAnswers,
  standupParticipants,
  standupSessionQuestions,
  standupSessions,
  standupSubmissions,
} from "@/db/schema";
import { toErrorResponse } from "@/lib/api";
import { normalizeEmail } from "@/lib/email";
import { publicSubmissionSchema } from "@/lib/validation";

const bodySchema = publicSubmissionSchema.extend({
  publicSlug: z.string().min(1),
});

// TODO: add rate limiting (e.g. Upstash Ratelimit keyed by ip + slug) before
// production. Public endpoint — keep it strictly write-only.
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const input = bodySchema.parse(json);

    const sessionRows = await db
      .select()
      .from(standupSessions)
      .where(eq(standupSessions.publicSlug, input.publicSlug))
      .limit(1);
    const session = sessionRows[0];
    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (session.status !== "open") {
      return NextResponse.json(
        { error: "This standup is closed." },
        { status: 409 }
      );
    }

    const questions = await db
      .select()
      .from(standupSessionQuestions)
      .where(eq(standupSessionQuestions.sessionId, session.id));

    // Server-side required-field validation against snapshotted questions.
    for (const q of questions) {
      if (q.isRequired) {
        const answer = (input.answers[q.id] ?? "").trim();
        if (!answer) {
          return NextResponse.json(
            { error: `Missing required answer`, questionId: q.id },
            { status: 422 }
          );
        }
      }
    }

    const normalizedEmail = normalizeEmail(input.email);

    // Upsert participant by (session_id, normalized_email).
    const participantRows = await db
      .insert(standupParticipants)
      .values({
        sessionId: session.id,
        name: input.name,
        email: input.email,
        normalizedEmail,
      })
      .onConflictDoUpdate({
        target: [
          standupParticipants.sessionId,
          standupParticipants.normalizedEmail,
        ],
        set: { name: input.name, email: input.email, updatedAt: new Date() },
      })
      .returning();
    const participant = participantRows[0];

    // New submission (historical submissions are preserved).
    const submissionRows = await db
      .insert(standupSubmissions)
      .values({
        sessionId: session.id,
        participantId: participant.id,
        userAgent: req.headers.get("user-agent") ?? null,
        ipHash: null, // not storing IPs for MVP
      })
      .returning();
    const submission = submissionRows[0];

    // Insert answers only for known session questions.
    const validQuestionIds = new Set(questions.map((q) => q.id));
    const answerRows = Object.entries(input.answers)
      .filter(([qid]) => validQuestionIds.has(qid))
      .map(([qid, text]) => ({
        submissionId: submission.id,
        sessionQuestionId: qid,
        answerText: text,
      }));
    if (answerRows.length > 0) {
      await db.insert(standupAnswers).values(answerRows);
    }

    // Point participant at the newest submission (drives latest-per-email view).
    await db
      .update(standupParticipants)
      .set({ latestSubmissionId: submission.id, updatedAt: new Date() })
      .where(
        and(
          eq(standupParticipants.id, participant.id),
          eq(standupParticipants.sessionId, session.id)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
