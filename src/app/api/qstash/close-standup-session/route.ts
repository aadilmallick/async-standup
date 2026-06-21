import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { standupSessions } from "@/db/schema";
import { verifyQstashRequest } from "@/lib/qstash";

const bodySchema = z.object({ sessionId: z.uuid() });

export async function POST(req: NextRequest) {
  const verified = await verifyQstashRequest(req);
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let sessionId: string;
  try {
    ({ sessionId } = bodySchema.parse(JSON.parse(verified.body)));
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(standupSessions)
    .where(eq(standupSessions.id, sessionId))
    .limit(1);
  const session = rows[0];

  // Missing session: nothing to do — idempotent success.
  if (!session) return NextResponse.json({ ok: true, notFound: true });

  // Already closed (e.g. manual close happened first): idempotent success.
  if (session.status === "closed") {
    return NextResponse.json({ ok: true, alreadyClosed: true });
  }

  await db
    .update(standupSessions)
    .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
    .where(eq(standupSessions.id, sessionId));

  return NextResponse.json({ ok: true });
}
