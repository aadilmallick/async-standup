import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  recurringScheduleRuns,
  recurringStandupSchedules,
  standupTemplates,
} from "@/db/schema";
import { verifyQstashRequest } from "@/lib/qstash";
import { createSessionFromTemplate } from "@/lib/sessions";
import { buildScheduledForKey, formatSessionTitle } from "@/lib/temporal";

const bodySchema = z.object({ recurringScheduleId: z.uuid() });

export async function POST(req: NextRequest) {
  const verified = await verifyQstashRequest(req);
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let recurringScheduleId: string;
  try {
    ({ recurringScheduleId } = bodySchema.parse(JSON.parse(verified.body)));
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const scheduleRows = await db
    .select()
    .from(recurringStandupSchedules)
    .where(eq(recurringStandupSchedules.id, recurringScheduleId))
    .limit(1);
  const schedule = scheduleRows[0];
  if (!schedule) return NextResponse.json({ ok: true, notFound: true });

  // Paused/deleted schedules must never create sessions, even on a stale msg.
  if (schedule.status !== "active") {
    return NextResponse.json({ ok: true, skipped: schedule.status });
  }

  // Template must still exist and belong to the schedule's org.
  const templateRows = await db
    .select()
    .from(standupTemplates)
    .where(
      and(
        eq(standupTemplates.id, schedule.templateId),
        eq(standupTemplates.organizationId, schedule.organizationId)
      )
    )
    .limit(1);
  const template = templateRows[0];
  if (!template) {
    return NextResponse.json({ ok: true, skipped: "template-missing" });
  }

  // Idempotency: round "now" to the scheduled minute in the schedule timezone
  // and claim a run row. A duplicate retry hits the unique constraint.
  const scheduledForKey = buildScheduledForKey(schedule.timezone);
  const runRows = await db
    .insert(recurringScheduleRuns)
    .values({ recurringScheduleId: schedule.id, scheduledForKey })
    .onConflictDoNothing({
      target: [
        recurringScheduleRuns.recurringScheduleId,
        recurringScheduleRuns.scheduledForKey,
      ],
    })
    .returning();
  if (runRows.length === 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  const run = runRows[0];

  const title = formatSessionTitle(schedule.sessionTitleFormat, {
    templateTitle: template.title,
    timezone: schedule.timezone,
  });

  // Creates the session, snapshots questions, sets scheduled_close_at, and
  // publishes the delayed close job (storing its message id).
  const session = await createSessionFromTemplate({
    organizationId: schedule.organizationId,
    templateId: schedule.templateId,
    title,
    recurringScheduleId: schedule.id,
    closeAfterMinutes: schedule.closeAfterMinutes,
  });

  await db
    .update(recurringScheduleRuns)
    .set({ sessionId: session.id })
    .where(eq(recurringScheduleRuns.id, run.id));

  await db
    .update(recurringStandupSchedules)
    .set({ lastRunAt: new Date(), updatedAt: new Date() })
    .where(eq(recurringStandupSchedules.id, schedule.id));

  return NextResponse.json({ ok: true, sessionId: session.id });
}
