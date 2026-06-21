import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { standupTemplates, templateQuestions } from "@/db/schema";
import { getCurrentOrganizationOrThrow } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { createTemplateSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const { user, organization } = await getCurrentOrganizationOrThrow();
    const body = await req.json();
    const input = createTemplateSchema.parse(body);

    const inserted = await db
      .insert(standupTemplates)
      .values({
        organizationId: organization.id,
        createdByUserId: user.id,
        title: input.title,
        description: input.description ?? null,
      })
      .returning();
    const template = inserted[0];

    await db.insert(templateQuestions).values(
      input.questions.map((q, i) => ({
        templateId: template.id,
        questionText: q.questionText,
        questionType: q.questionType,
        isRequired: q.isRequired,
        sortOrder: i,
      }))
    );

    return NextResponse.json({ id: template.id }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
