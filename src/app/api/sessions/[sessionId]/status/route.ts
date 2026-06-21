import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { standupSessions } from "@/db/schema";
import { assertSessionAccess } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { sessionStatusActionSchema } from "@/lib/validation";

// Manual close/reopen. Manual close overrides any scheduled close; a stale
// QStash close job is a no-op because the close endpoint is idempotent.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    await assertSessionAccess(sessionId);

    const body = await req.json();
    const { action } = sessionStatusActionSchema.parse(body);

    if (action === "close") {
      await db
        .update(standupSessions)
        .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
        .where(eq(standupSessions.id, sessionId));
    } else {
      // Reopen: clear closedAt and scheduled close so it stays open until
      // closed again manually.
      await db
        .update(standupSessions)
        .set({
          status: "open",
          closedAt: null,
          scheduledCloseAt: null,
          updatedAt: new Date(),
        })
        .where(eq(standupSessions.id, sessionId));
    }

    return NextResponse.json({ ok: true, status: action === "close" ? "closed" : "open" });
  } catch (err) {
    return toErrorResponse(err);
  }
}
