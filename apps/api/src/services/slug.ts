import { randomBytes } from "node:crypto";
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars
export function generateSlug(len = 8): string {
  const b = randomBytes(len);
  return Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
}
