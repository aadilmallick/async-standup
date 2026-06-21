import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { recurringStandupSchedules } from "@/db/schema";
import { assertScheduleAccess } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { deleteRecurringSchedule } from "@/lib/qstash";

// Pause: mark paused and delete the QStash schedule. The open endpoint also
// re-checks status, so a stale message would not create a session anyway.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const { schedule } = await assertScheduleAccess(scheduleId);

    await deleteRecurringSchedule(schedule.id);
    await db
      .update(recurringStandupSchedules)
      .set({ status: "paused", qstashScheduleId: null, updatedAt: new Date() })
      .where(eq(recurringStandupSchedules.id, scheduleId));

    return NextResponse.json({ ok: true, status: "paused" });
  } catch (err) {
    return toErrorResponse(err);
  }
}
