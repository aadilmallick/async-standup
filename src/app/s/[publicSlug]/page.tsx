import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { standupSessionQuestions, standupSessions } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandupForm } from "@/components/public/standup-form";

export default async function PublicStandupPage({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  const { publicSlug } = await params;

  const sessionRows = await db
    .select()
    .from(standupSessions)
    .where(eq(standupSessions.publicSlug, publicSlug))
    .limit(1);
  const session = sessionRows[0];
  if (!session) notFound();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-12">
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="grid size-6 place-items-center rounded bg-primary text-primary-foreground text-xs">
          A
        </span>
        AsyncStand
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{session.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {session.status !== "open" ? (
            <div className="py-10 text-center">
              <p className="text-lg font-medium">This standup is closed.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Responses are no longer being accepted.
              </p>
            </div>
          ) : (
            <OpenForm sessionId={session.id} publicSlug={publicSlug} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function OpenForm({
  sessionId,
  publicSlug,
}: {
  sessionId: string;
  publicSlug: string;
}) {
  const questions = await db
    .select()
    .from(standupSessionQuestions)
    .where(eq(standupSessionQuestions.sessionId, sessionId))
    .orderBy(standupSessionQuestions.sortOrder);

  return (
    <StandupForm
      publicSlug={publicSlug}
      questions={questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        isRequired: q.isRequired,
      }))}
    />
  );
}
