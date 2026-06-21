import { notFound } from "next/navigation";

import {
  assertScheduleAccess,
  getCurrentOrganizationOrThrow,
  NotFoundError,
} from "@/lib/auth";
import { listTemplates } from "@/db/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { ScheduleForm } from "@/components/forms/schedule-form";

export default async function EditSchedulePage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = await params;

  let schedule;
  try {
    ({ schedule } = await assertScheduleAccess(scheduleId));
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const { organization } = await getCurrentOrganizationOrThrow();
  const templates = await listTemplates(organization.id);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit schedule" />
      <ScheduleForm
        mode="edit"
        scheduleId={scheduleId}
        templates={templates.map((t) => ({ id: t.id, title: t.title }))}
        initial={{
          name: schedule.name,
          templateId: schedule.templateId,
          recurrenceType: schedule.recurrenceType as
            | "daily"
            | "weekdays"
            | "custom",
          weekdays: schedule.weekdays ?? [],
          localTime: schedule.localTime,
          timezone: schedule.timezone,
          closeAfterMinutes: schedule.closeAfterMinutes,
          sessionTitleFormat: schedule.sessionTitleFormat,
          active: schedule.status === "active",
        }}
      />
    </div>
  );
}
