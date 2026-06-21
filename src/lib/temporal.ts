import { Temporal } from "temporal-polyfill";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Returns true if the IANA timezone string is valid. */
export function isValidTimeZone(timezone: string): boolean {
  try {
    Temporal.Now.instant().toZonedDateTimeISO(timezone);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats the current (or given) instant as a local date in the timezone,
 * e.g. "Jun 20, 2026".
 */
export function formatLocalDate(
  timezone: string,
  instant: Temporal.Instant = Temporal.Now.instant()
): string {
  const zdt = instant.toZonedDateTimeISO(timezone);
  return `${MONTHS_SHORT[zdt.month - 1]} ${zdt.day}, ${zdt.year}`;
}

/**
 * Renders a session title from a format string. Supported tokens:
 *   {templateTitle}  {date}
 * Example: "Engineering Daily Standup — Jun 20, 2026".
 */
export function formatSessionTitle(
  format: string,
  vars: { templateTitle: string; timezone: string; instant?: Temporal.Instant }
): string {
  const date = formatLocalDate(vars.timezone, vars.instant);
  return format
    .replace(/\{templateTitle\}/g, vars.templateTitle)
    .replace(/\{date\}/g, date);
}

/**
 * Computes the UTC close time `closeAfterMinutes` after `from` using Temporal
 * arithmetic. Returns a JS Date suitable for storage as timestamptz.
 */
export function computeScheduledCloseAt(
  closeAfterMinutes: number,
  from: Date = new Date()
): Date {
  const instant = Temporal.Instant.fromEpochMilliseconds(from.getTime());
  const closeInstant = instant.add({ minutes: closeAfterMinutes });
  return new Date(closeInstant.epochMilliseconds);
}

/**
 * Builds an idempotency key for a recurring run, rounding the instant down to
 * the minute in the schedule timezone, e.g. "2026-06-20T09:00[America/New_York]".
 */
export function buildScheduledForKey(
  timezone: string,
  instant: Temporal.Instant = Temporal.Now.instant()
): string {
  const zdt = instant
    .toZonedDateTimeISO(timezone)
    .round({ smallestUnit: "minute", roundingMode: "floor" });
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(zdt.year, 4)}-${pad(zdt.month)}-${pad(zdt.day)}T${pad(
    zdt.hour
  )}:${pad(zdt.minute)}[${timezone}]`;
}
