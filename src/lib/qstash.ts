import { Client, Receiver } from "@upstash/qstash";

/**
 * QStash helpers for:
 *  - creating/deleting recurring "open standup" schedules
 *  - publishing delayed "close standup" one-off jobs
 *  - verifying inbound QStash webhook signatures
 *
 * Clients are created lazily so the module can be imported during build
 * without the env vars being present.
 */

let _client: Client | null = null;
let _receiver: Receiver | null = null;

export function qstashClient(): Client {
  if (!_client) {
    const token = process.env.QSTASH_TOKEN;
    if (!token) throw new Error("QSTASH_TOKEN is not set.");
    _client = new Client({ token });
  }
  return _client;
}

function qstashReceiver(): Receiver {
  if (!_receiver) {
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (!currentSigningKey || !nextSigningKey) {
      throw new Error("QStash signing keys are not set.");
    }
    _receiver = new Receiver({ currentSigningKey, nextSigningKey });
  }
  return _receiver;
}

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not set.");
  return url.replace(/\/$/, "");
}

export const OPEN_RECURRING_PATH = "/api/qstash/open-recurring-standup";
export const CLOSE_SESSION_PATH = "/api/qstash/close-standup-session";

/** Deterministic QStash schedule id for a recurring schedule row. */
export function qstashScheduleId(recurringScheduleId: string): string {
  return `recurring-standup-${recurringScheduleId}`;
}

/**
 * Creates (or overwrites, via the deterministic scheduleId) a recurring QStash
 * schedule that POSTs the recurring schedule id to the open-standup endpoint.
 * Returns the QStash schedule id.
 */
export async function createRecurringOpenSchedule(params: {
  recurringScheduleId: string;
  cron: string;
}): Promise<string> {
  const scheduleId = qstashScheduleId(params.recurringScheduleId);
  const result = await qstashClient().schedules.create({
    scheduleId,
    destination: `${appUrl()}${OPEN_RECURRING_PATH}`,
    cron: params.cron,
    body: JSON.stringify({ recurringScheduleId: params.recurringScheduleId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return result.scheduleId ?? scheduleId;
}

/** Deletes a recurring QStash schedule. Ignores "not found" errors. */
export async function deleteRecurringSchedule(
  recurringScheduleId: string
): Promise<void> {
  try {
    await qstashClient().schedules.delete(qstashScheduleId(recurringScheduleId));
  } catch (err) {
    // Idempotent: a missing schedule is fine (e.g. already deleted).
    if (process.env.NODE_ENV !== "production") {
      console.warn("deleteRecurringSchedule:", (err as Error).message);
    }
  }
}

/**
 * Publishes a delayed one-off job that closes a specific session after
 * `closeAfterMinutes`. Returns the QStash message id if available.
 */
export async function publishDelayedCloseSession(params: {
  sessionId: string;
  closeAfterMinutes: number;
}): Promise<string | undefined> {
  const res = await qstashClient().publishJSON({
    url: `${appUrl()}${CLOSE_SESSION_PATH}`,
    body: { sessionId: params.sessionId },
    delay: params.closeAfterMinutes * 60, // seconds
  });
  // publishJSON returns a single response (or array for url groups).
  return Array.isArray(res) ? res[0]?.messageId : res.messageId;
}

/**
 * Verifies a QStash webhook signature. Returns the raw body string on success
 * so the caller can parse it. Returns null when verification fails.
 */
export async function verifyQstashRequest(
  req: Request
): Promise<{ body: string } | null> {
  const signature = req.headers.get("upstash-signature");
  if (!signature) return null;
  const body = await req.text();
  try {
    const valid = await qstashReceiver().verify({ signature, body });
    return valid ? { body } : null;
  } catch {
    return null;
  }
}
