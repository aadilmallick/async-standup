import { customAlphabet } from "nanoid";

// URL-safe, unambiguous alphabet (no 0/O/1/l/I) for public standup slugs.
const alphabet = "23456789abcdefghijkmnpqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 12);

/**
 * Generates an unguessable public slug for a standup session.
 * ~12 chars over a 32-char alphabet ≈ 60 bits of entropy.
 */
export function generatePublicSlug(): string {
  return nanoid();
}
