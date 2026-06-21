/**
 * Normalizes an email for dedup/lookup by trimming and lowercasing.
 * Used for the unique (session_id, normalized_email) participant constraint.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
