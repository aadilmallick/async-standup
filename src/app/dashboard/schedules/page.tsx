import Link from "next/link";
import { Plus } from "lucide-react";

import { getCurrentOrganizationOrThrow } from "@/lib/auth";
import { listSchedules } from "@/db/queries";
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
import { ScheduleActions } from "@/components/dashboard/schedule-actions";
import { recurrenceSummary } from "@/lib/format";

const STATUS_VARIANT: Record<
  string,
  "success" | "secondary" | "outline"
> = {
  active: "success",
  paused: "secondary",
};

export default async function SchedulesPage() {
  const { organization } = await getCurrentOrganizationOrThrow();
  const schedules = await listSchedules(organization.id);

  return (
    <div>
      <PageHeader
        title="Recurring Schedules"
        description="Automatically open standups on a recurring cadence."
      >
        <Button asChild>
          <Link href="/dashboard/schedules/new">
            <Plus /> New schedule
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No recurring schedules yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead>Open</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead className="text-right">Close after</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.templateTitle ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {recurrenceSummary({
                        recurrenceType: s.recurrenceType,
                        weekdays: s.weekdays,
                      })}
                    </TableCell>
                    <TableCell className="text-sm">{s.localTime}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.timezone}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {s.closeAfterMinutes}m
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[s.status] ?? "secondary"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ScheduleActions scheduleId={s.id} status={s.status} />
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
