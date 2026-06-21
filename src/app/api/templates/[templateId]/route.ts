import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { standupTemplates, templateQuestions } from "@/db/schema";
import { assertTemplateAccess } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { updateTemplateSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
    await assertTemplateAccess(templateId);

    const body = await req.json();
    const input = updateTemplateSchema.parse(body);

    await db
      .update(standupTemplates)
      .set({
        title: input.title,
        description: input.description ?? null,
        updatedAt: new Date(),
      })
      .where(eq(standupTemplates.id, templateId));

    // Replace questions wholesale (re-numbering sort order). Existing sessions
    // are unaffected because they hold snapshotted questions.
    await db
      .delete(templateQuestions)
      .where(eq(templateQuestions.templateId, templateId));

    await db.insert(templateQuestions).values(
      input.questions.map((q, i) => ({
        templateId,
        questionText: q.questionText,
        questionType: q.questionType,
        isRequired: q.isRequired,
        sortOrder: i,
      }))
    );

    return NextResponse.json({ id: templateId });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
    await assertTemplateAccess(templateId);

    await db
      .delete(standupTemplates)
      .where(eq(standupTemplates.id, templateId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
