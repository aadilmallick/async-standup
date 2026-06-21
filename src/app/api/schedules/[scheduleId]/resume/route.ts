import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { recurringStandupSchedules } from "@/db/schema";
import { assertScheduleAccess } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { createRecurringOpenSchedule } from "@/lib/qstash";

// Resume: mark active and recreate the QStash schedule from the stored cron.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const { schedule } = await assertScheduleAccess(scheduleId);

    const qstashId = await createRecurringOpenSchedule({
      recurringScheduleId: schedule.id,
      cron: schedule.cronExpression,
    });

    await db
      .update(recurringStandupSchedules)
      .set({
        status: "active",
        qstashScheduleId: qstashId,
        updatedAt: new Date(),
      })
      .where(eq(recurringStandupSchedules.id, scheduleId));

    return NextResponse.json({ ok: true, status: "active" });
  } catch (err) {
    return toErrorResponse(err);
  }
}
