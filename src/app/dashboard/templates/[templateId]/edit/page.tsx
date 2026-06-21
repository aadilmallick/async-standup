import { notFound } from "next/navigation";

import { getCurrentOrganizationOrThrow } from "@/lib/auth";
import { getTemplateWithQuestions } from "@/db/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { TemplateForm } from "@/components/forms/template-form";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const { organization } = await getCurrentOrganizationOrThrow();
  const data = await getTemplateWithQuestions(templateId, organization.id);
  if (!data) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Edit template"
        description="Changes here do not affect existing sessions."
      />
      <TemplateForm
        mode="edit"
        templateId={templateId}
        initial={{
          title: data.template.title,
          description: data.template.description ?? "",
          questions: data.questions.map((q) => ({
            questionText: q.questionText,
            isRequired: q.isRequired,
          })),
        }}
      />
    </div>
  );
}
