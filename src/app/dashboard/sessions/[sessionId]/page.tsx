import { notFound } from "next/navigation";

import { assertSessionAccess, NotFoundError } from "@/lib/auth";
import { getSessionResponses } from "@/db/queries";
import { SessionDetail } from "@/components/dashboard/session-detail";
import type { SessionResponsesData } from "@/hooks/use-session-responses";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  let session;
  try {
    ({ session } = await assertSessionAccess(sessionId));
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const data = await getSessionResponses(sessionId);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const publicUrl = `${appUrl}/s/${session.publicSlug}`;

  const initialData: SessionResponsesData = {
    session: {
      id: session.id,
      title: session.title,
      status: session.status as "open" | "closed",
      publicSlug: session.publicSlug,
      openedAt: session.openedAt.toISOString(),
      scheduledCloseAt: session.scheduledCloseAt?.toISOString() ?? null,
      closedAt: session.closedAt?.toISOString() ?? null,
    },
    questions: data.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      sortOrder: q.sortOrder,
    })),
    responses: data.responses.map((r) => ({
      participantId: r.participantId,
      name: r.name,
      email: r.email,
      submittedAt: r.submittedAt.toISOString(),
      answers: r.answers,
    })),
    responseCount: data.responseCount,
  };

  return (
    <SessionDetail
      sessionId={sessionId}
      publicUrl={publicUrl}
      initialData={initialData}
    />
  );
}
