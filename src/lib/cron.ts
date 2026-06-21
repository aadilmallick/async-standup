export type RecurrenceType = "daily" | "weekdays" | "custom";

export interface BuildCronInput {
  recurrenceType: RecurrenceType;
  weekdays?: number[] | null;
  localTime: string; // "HH:mm"
  timezone: string; // IANA tz
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Parses and validates a "HH:mm" string into numeric hour/minute.
 * Throws on invalid input.
 */
export function parseLocalTime(localTime: string): {
  hour: number;
  minute: number;
} {
  const match = TIME_RE.exec(localTime.trim());
  if (!match) {
    throw new Error(`Invalid localTime "${localTime}" (expected HH:mm).`);
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/**
 * Builds a QStash-compatible cron expression with a timezone prefix, e.g.
 * `CRON_TZ=America/New_York 0 9 * * 1,3,5`.
 */
export function buildCronExpression(input: BuildCronInput): string {
  const { recurrenceType, weekdays, localTime, timezone } = input;

  if (!timezone || !timezone.trim()) {
    throw new Error("timezone is required.");
  }

  const { hour, minute } = parseLocalTime(localTime);

  let dayOfWeek: string;
  switch (recurrenceType) {
    case "daily":
      dayOfWeek = "*";
      break;
    case "weekdays":
      dayOfWeek = "1,2,3,4,5";
      break;
    case "custom": {
      const days = weekdays ?? [];
      if (days.length === 0) {
        throw new Error("custom recurrence requires at least one weekday.");
      }
      for (const d of days) {
        if (!Number.isInteger(d) || d < 0 || d > 6) {
          throw new Error(`Invalid weekday "${d}" (expected 0-6).`);
        }
      }
      // Sort + dedupe for a deterministic expression.
      dayOfWeek = Array.from(new Set(days))
        .sort((a, b) => a - b)
        .join(",");
      break;
    }
    default:
      throw new Error(`Unknown recurrence type "${recurrenceType}".`);
  }

  return `CRON_TZ=${timezone} ${minute} ${hour} * * ${dayOfWeek}`;
}
