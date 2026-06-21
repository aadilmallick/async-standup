import Link from "next/link";

import { getCurrentOrganizationOrThrow } from "@/lib/auth";
import { listSessions, type SessionStatusFilter } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { ClientDate } from "@/components/client-date";
import { cn } from "@/lib/utils";

const FILTERS: { value: SessionStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filter: SessionStatusFilter =
    sp.status === "open" || sp.status === "closed" ? sp.status : "all";

  const { organization } = await getCurrentOrganizationOrThrow();
  const sessions = await listSessions(organization.id, filter);

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="All standup sessions across your workspace."
      />

      <div className="mb-4 flex gap-1">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            asChild
            size="sm"
            variant={filter === f.value ? "default" : "ghost"}
          >
            <Link href={`/dashboard/sessions?status=${f.value}`}>{f.label}</Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No sessions found. Start one from a template.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Responses</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/sessions/${s.id}`}
                        className={cn("font-medium hover:underline")}
                      >
                        {s.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={s.status === "open" ? "success" : "secondary"}
                      >
                        {s.status === "open" ? "Open" : "Closed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.responseCount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <ClientDate value={s.openedAt} mode="date" />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <ClientDate value={s.closedAt} mode="date" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
