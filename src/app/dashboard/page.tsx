import Link from "next/link";
import { ArrowRight, CalendarClock, ListChecks, Megaphone, Plus } from "lucide-react";

import { getCurrentOrganizationOrThrow } from "@/lib/auth";
import { listSchedules, listSessions, listTemplates } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { ClientDate } from "@/components/client-date";

export default async function DashboardPage() {
  const { organization } = await getCurrentOrganizationOrThrow();
  const [allSessions, templates, schedules] = await Promise.all([
    listSessions(organization.id, "all"),
    listTemplates(organization.id),
    listSchedules(organization.id),
  ]);

  const openSessions = allSessions.filter((s) => s.status === "open");
  const recentSessions = allSessions.slice(0, 5);
  const activeSchedules = schedules.filter((s) => s.status === "active");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your async standups at a glance."
      >
        <Button asChild>
          <Link href="/dashboard/templates/new">
            <Plus /> New template
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Megaphone className="size-5 text-primary" />}
          label="Open sessions"
          value={openSessions.length}
          href="/dashboard/sessions?status=open"
        />
        <StatCard
          icon={<ListChecks className="size-5 text-primary" />}
          label="Templates"
          value={templates.length}
          href="/dashboard/templates"
        />
        <StatCard
          icon={<CalendarClock className="size-5 text-primary" />}
          label="Active schedules"
          value={activeSchedules.length}
          href="/dashboard/schedules"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent sessions</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/sessions">
                View all <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSessions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No sessions yet.
              </p>
            ) : (
              recentSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-accent/50"
                >
                  <span className="truncate font-medium">{s.title}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {s.responseCount} resp
                    </span>
                    <Badge
                      variant={s.status === "open" ? "success" : "secondary"}
                    >
                      {s.status}
                    </Badge>
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Templates</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/templates">
                View all <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No templates yet.
              </p>
            ) : (
              templates.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <Link
                    href={`/dashboard/templates/${t.id}/edit`}
                    className="truncate font-medium hover:underline"
                  >
                    {t.title}
                  </Link>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/templates/${t.id}/start`}>
                      Start
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {activeSchedules.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Active schedules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSchedules.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">
                  {s.localTime} · {s.timezone}
                  {s.lastRunAt ? (
                    <>
                      {" "}
                      · last run <ClientDate value={s.lastRunAt} mode="date" />
                    </>
                  ) : null}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent/40">
        <CardContent className="flex items-center gap-4">
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10">
            {icon}
          </div>
          <div>
            <div className="text-2xl font-semibold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
