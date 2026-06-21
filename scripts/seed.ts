/**
 * Optional seed helper. Inserts a sample standup template (with questions) into
 * an organization so you can try the app quickly.
 *
 * Usage:
 *   pnpm seed                       # seeds the first organization found
 *   ORG_ID=<uuid> pnpm seed         # seeds a specific organization
 *
 * Organizations are normally auto-created on first dashboard login, so sign in
 * once before running this, or pass ORG_ID explicitly.
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "@/db";
import {
  organizations,
  standupTemplates,
  templateQuestions,
} from "@/db/schema";

const SAMPLE_TITLE = "Engineering Daily Standup";
const SAMPLE_QUESTIONS = [
  "What did you work on yesterday?",
  "What are you working on today?",
  "Any blockers?",
  "Anything you need from the team?",
];

async function main() {
  const orgId = process.env.ORG_ID;

  const org = orgId
    ? (
        await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .limit(1)
      )[0]
    : (await db.select().from(organizations).limit(1))[0];

  if (!org) {
    console.error(
      "No organization found. Sign in to the dashboard once to create your workspace, or pass ORG_ID."
    );
    process.exit(1);
  }

  // Idempotent: skip if a template with the sample title already exists.
  const existing = await db
    .select()
    .from(standupTemplates)
    .where(eq(standupTemplates.organizationId, org.id));
  if (existing.some((t) => t.title === SAMPLE_TITLE)) {
    console.log(`Sample template already exists in "${org.name}". Nothing to do.`);
    return;
  }

  const [template] = await db
    .insert(standupTemplates)
    .values({
      organizationId: org.id,
      title: SAMPLE_TITLE,
      description: "A simple daily async standup to keep the team in sync.",
    })
    .returning();

  await db.insert(templateQuestions).values(
    SAMPLE_QUESTIONS.map((questionText, i) => ({
      templateId: template.id,
      questionText,
      questionType: "textarea",
      isRequired: i < 3,
      sortOrder: i,
    }))
  );

  console.log(
    `Seeded template "${SAMPLE_TITLE}" with ${SAMPLE_QUESTIONS.length} questions into "${org.name}".`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
