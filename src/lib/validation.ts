import { z } from "zod";

import { isValidTimeZone } from "./temporal";

// ── Templates ────────────────────────────────────────────────────────────────
export const questionInputSchema = z.object({
  id: z.uuid().optional(), // present when editing an existing question
  questionText: z.string().trim().min(1, "Question text is required").max(500),
  questionType: z.literal("textarea").default("textarea"),
  isRequired: z.boolean().default(true),
});

export const createTemplateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  questions: z
    .array(questionInputSchema)
    .min(1, "Add at least one question"),
});

export const updateTemplateSchema = createTemplateSchema;

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

// ── Manual session ───────────────────────────────────────────────────────────
export const createManualSessionSchema = z.object({
  templateId: z.uuid(),
  title: z.string().trim().min(1, "Session title is required").max(200),
  closeAfterMinutes: z
    .number()
    .int()
    .min(5)
    .max(1440)
    .optional()
    .nullable(),
});

export type CreateManualSessionInput = z.infer<
  typeof createManualSessionSchema
>;

// ── Public submission ────────────────────────────────────────────────────────
export const publicSubmissionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.email("Enter a valid email").max(200),
  // Map of sessionQuestionId -> answer text. Required-field checks happen
  // server-side against the snapshotted session questions.
  answers: z.record(z.string(), z.string()),
});

export type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>;

// ── Recurring schedules ──────────────────────────────────────────────────────
const recurrenceTypeEnum = z.enum(["daily", "weekdays", "custom"]);

export const createRecurringScheduleSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    templateId: z.uuid(),
    recurrenceType: recurrenceTypeEnum,
    weekdays: z.array(z.number().int().min(0).max(6)).optional().nullable(),
    localTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use HH:mm (24-hour)"),
    timezone: z
      .string()
      .min(1, "Timezone is required")
      .refine(isValidTimeZone, "Invalid timezone"),
    closeAfterMinutes: z.number().int().min(5).max(1440),
    sessionTitleFormat: z
      .string()
      .trim()
      .min(1, "Title format is required")
      .max(200),
    active: z.boolean().default(true),
  })
  .refine(
    (v) =>
      v.recurrenceType !== "custom" ||
      (Array.isArray(v.weekdays) && v.weekdays.length > 0),
    {
      message: "Select at least one day for custom recurrence",
      path: ["weekdays"],
    }
  );

export type CreateRecurringScheduleInput = z.infer<
  typeof createRecurringScheduleSchema
>;

export const updateRecurringScheduleSchema = createRecurringScheduleSchema;

// ── Session status ───────────────────────────────────────────────────────────
export const sessionStatusActionSchema = z.object({
  action: z.enum(["close", "reopen"]),
});
