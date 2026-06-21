import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { recurringStandupSchedules } from "@/db/schema";
import { assertScheduleAccess, assertTemplateAccess } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { buildCronExpression } from "@/lib/cron";
import {
  createRecurringOpenSchedule,
  deleteRecurringSchedule,
} from "@/lib/qstash";
import { updateRecurringScheduleSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const { schedule } = await assertScheduleAccess(scheduleId);

    const body = await req.json();
    const input = updateRecurringScheduleSchema.parse(body);

    // Ensure the (possibly changed) template still belongs to the org.
    await assertTemplateAccess(input.templateId);

    const cronExpression = buildCronExpression({
      recurrenceType: input.recurrenceType,
      weekdays: input.weekdays,
      localTime: input.localTime,
      timezone: input.timezone,
    });

    const status = input.active ? "active" : "paused";

    await db
      .update(recurringStandupSchedules)
      .set({
        name: input.name,
        templateId: input.templateId,
        status,
        recurrenceType: input.recurrenceType,
        weekdays:
          input.recurrenceType === "custom" ? input.weekdays ?? [] : null,
        localTime: input.localTime,
        timezone: input.timezone,
        cronExpression,
        closeAfterMinutes: input.closeAfterMinutes,
        sessionTitleFormat: input.sessionTitleFormat,
        updatedAt: new Date(),
      })
      .where(eq(recurringStandupSchedules.id, scheduleId));

    // Overwrite the QStash schedule using the deterministic id, or remove it
    // when the schedule is paused.
    if (status === "active") {
      const qstashId = await createRecurringOpenSchedule({
        recurringScheduleId: schedule.id,
        cron: cronExpression,
      });
      await db
        .update(recurringStandupSchedules)
        .set({ qstashScheduleId: qstashId })
        .where(eq(recurringStandupSchedules.id, scheduleId));
    } else {
      await deleteRecurringSchedule(schedule.id);
      await db
        .update(recurringStandupSchedules)
        .set({ qstashScheduleId: null })
        .where(eq(recurringStandupSchedules.id, scheduleId));
    }

    return NextResponse.json({ id: scheduleId });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const { schedule } = await assertScheduleAccess(scheduleId);

    // Soft delete (preserve history); remove the live QStash schedule.
    await deleteRecurringSchedule(schedule.id);
    await db
      .update(recurringStandupSchedules)
      .set({ status: "deleted", qstashScheduleId: null, updatedAt: new Date() })
      .where(eq(recurringStandupSchedules.id, scheduleId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
