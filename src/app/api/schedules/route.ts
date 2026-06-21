import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { recurringStandupSchedules } from "@/db/schema";
import { assertTemplateAccess } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { buildCronExpression } from "@/lib/cron";
import { createRecurringOpenSchedule } from "@/lib/qstash";
import { createRecurringScheduleSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = createRecurringScheduleSchema.parse(body);

    // Confirm the manager owns the template (and resolves their org).
    const { user, organization } = await assertTemplateAccess(
      input.templateId
    );

    const cronExpression = buildCronExpression({
      recurrenceType: input.recurrenceType,
      weekdays: input.weekdays,
      localTime: input.localTime,
      timezone: input.timezone,
    });

    const status = input.active ? "active" : "paused";

    const inserted = await db
      .insert(recurringStandupSchedules)
      .values({
        organizationId: organization.id,
        templateId: input.templateId,
        createdByUserId: user.id,
        name: input.name,
        status,
        recurrenceType: input.recurrenceType,
        weekdays:
          input.recurrenceType === "custom" ? input.weekdays ?? [] : null,
        localTime: input.localTime,
        timezone: input.timezone,
        cronExpression,
        closeAfterMinutes: input.closeAfterMinutes,
        sessionTitleFormat: input.sessionTitleFormat,
      })
      .returning();
    const schedule = inserted[0];

    // Only active schedules get a live QStash schedule.
    if (status === "active") {
      try {
        const scheduleId = await createRecurringOpenSchedule({
          recurringScheduleId: schedule.id,
          cron: cronExpression,
        });
        await db
          .update(recurringStandupSchedules)
          .set({ qstashScheduleId: scheduleId, updatedAt: new Date() })
          .where(eq(recurringStandupSchedules.id, schedule.id));
        schedule.qstashScheduleId = scheduleId;
      } catch (err) {
        // Roll back the row so we don't leave a "live" schedule that never fires.
        await db
          .delete(recurringStandupSchedules)
          .where(eq(recurringStandupSchedules.id, schedule.id));
        throw err;
      }
    }

    return NextResponse.json({ id: schedule.id }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
