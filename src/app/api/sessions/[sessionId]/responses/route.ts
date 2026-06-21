import { NextRequest, NextResponse } from "next/server";

import { assertSessionAccess } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { getSessionResponses } from "@/db/queries";

// Polled every 30s by the session detail page (TanStack Query).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { session } = await assertSessionAccess(sessionId);
    const data = await getSessionResponses(sessionId);

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        publicSlug: session.publicSlug,
        openedAt: session.openedAt,
        scheduledCloseAt: session.scheduledCloseAt,
        closedAt: session.closedAt,
      },
      questions: data.questions,
      responses: data.responses,
      responseCount: data.responseCount,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
