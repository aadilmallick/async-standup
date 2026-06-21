import { getCurrentOrganizationOrThrow } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function SettingsPage() {
  const { user, organization } = await getCurrentOrganizationOrThrow();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Workspace and account details." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Workspace name" value={organization.name} />
          <Row label="Signed in as" value={user.email} />
          {user.name ? <Row label="Name" value={user.name} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
