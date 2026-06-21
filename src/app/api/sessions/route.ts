import { NextRequest, NextResponse } from "next/server";

import { assertTemplateAccess } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { createSessionFromTemplate } from "@/lib/sessions";
import { createManualSessionSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = createManualSessionSchema.parse(body);

    // Asserts the template belongs to the caller's organization.
    const { user, organization } = await assertTemplateAccess(
      input.templateId
    );

    const session = await createSessionFromTemplate({
      organizationId: organization.id,
      templateId: input.templateId,
      title: input.title,
      createdByUserId: user.id,
      closeAfterMinutes: input.closeAfterMinutes ?? null,
    });

    return NextResponse.json(
      { id: session.id, publicSlug: session.publicSlug },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
