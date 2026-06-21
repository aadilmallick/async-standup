import { PageHeader } from "@/components/dashboard/page-header";
import { TemplateForm } from "@/components/forms/template-form";

export default function NewTemplatePage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="New template"
        description="Add ordered questions for your team to answer."
      />
      <TemplateForm mode="create" />
    </div>
  );
}
