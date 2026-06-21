import Link from "next/link";

import { getCurrentOrganizationOrThrow } from "@/lib/auth";
import { listTemplates } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { ScheduleForm } from "@/components/forms/schedule-form";

export default async function NewSchedulePage() {
  const { organization } = await getCurrentOrganizationOrThrow();
  const templates = await listTemplates(organization.id);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New recurring schedule"
        description="Open a standup automatically on a recurring cadence."
      />
      {templates.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Create a template first — schedules open standups from a template.
            </p>
            <Button asChild>
              <Link href="/dashboard/templates/new">Create a template</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScheduleForm
          mode="create"
          templates={templates.map((t) => ({ id: t.id, title: t.title }))}
        />
      )}
    </div>
  );
}
