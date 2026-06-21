import Link from "next/link";
import { Plus } from "lucide-react";

import { getCurrentOrganizationOrThrow } from "@/lib/auth";
import { listTemplates } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { TemplateActions } from "@/components/dashboard/template-actions";
import { ClientDate } from "@/components/client-date";

export default async function TemplatesPage() {
  const { organization } = await getCurrentOrganizationOrThrow();
  const templates = await listTemplates(organization.id);

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Reusable standup forms with ordered questions."
      >
        <Button asChild>
          <Link href="/dashboard/templates/new">
            <Plus /> New template
          </Link>
        </Button>
      </PageHeader>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No templates yet. Create your first standup template to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/dashboard/templates/${t.id}/edit`}
                    className="font-medium hover:underline"
                  >
                    {t.title}
                  </Link>
                  <TemplateActions templateId={t.id} templateTitle={t.title} />
                </div>
                {t.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {t.description}
                  </p>
                ) : null}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {t.questionCount} question
                    {t.questionCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    Updated <ClientDate value={t.updatedAt} mode="date" />
                  </span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/dashboard/templates/${t.id}/start`}>
                      Start session
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
