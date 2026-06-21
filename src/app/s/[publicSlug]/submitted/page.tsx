import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function SubmittedPage({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  const { publicSlug } = await params;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-12">
      <Card>
        <CardContent className="space-y-4 py-12 text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
          <h1 className="text-2xl font-semibold">Thanks — you&apos;re in!</h1>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Your standup was submitted. While this standup stays open, you can
            resubmit using the same link and email — we&apos;ll keep only your
            latest response.
          </p>
          <Button asChild variant="outline">
            <Link href={`/s/${publicSlug}`}>Submit again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
