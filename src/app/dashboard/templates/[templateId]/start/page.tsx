import { notFound } from "next/navigation";
import { Temporal } from "temporal-polyfill";

import { getCurrentOrganizationOrThrow } from "@/lib/auth";
import { getTemplateWithQuestions } from "@/db/queries";
import { formatLocalDate } from "@/lib/temporal";
import { PageHeader } from "@/components/dashboard/page-header";
import { StartSessionForm } from "@/components/forms/start-session-form";

export default async function StartSessionPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const { organization } = await getCurrentOrganizationOrThrow();
  const data = await getTemplateWithQuestions(templateId, organization.id);
  if (!data) notFound();

  // Default title mirrors the recurring format using the server's timezone.
  const tz = Temporal.Now.timeZoneId();
  const defaultTitle = `${data.template.title} — ${formatLocalDate(tz)}`;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Start a standup"
        description={`From template “${data.template.title}”. Questions are snapshotted now.`}
      />
      <StartSessionForm templateId={templateId} defaultTitle={defaultTitle} />
    </div>
  );
}
