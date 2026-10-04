import { createHash } from "node:crypto";
import type { ChallengeDto } from "@unsaid/shared";
import { hmacHex, randomToken, safeEqual } from "./crypto";
import type { RateLimitStore } from "./ratelimit";

const TTL_MS = 5 * 60_000;

/** Stateless proof-of-work challenge: id = `${expiry}.${nonce}.${hmac}`; single-use via the store. */
export function issueChallenge(secret: string, difficulty: number): ChallengeDto {
  const expires = Date.now() + TTL_MS;
  const body = `${expires}.${randomToken(12)}`;
  const id = `${body}.${hmacHex(secret, `pow:${body}`).slice(0, 32)}`;
  return { id, algorithm: "sha256-leading-zero-bits", difficulty, prefix: `${id}:`, expiresAt: new Date(expires).toISOString() };
}

export function leadingZeroBits(buf: Buffer): number {
  let bits = 0;
  for (const byte of buf) {
    if (byte === 0) { bits += 8; continue; }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}

export async function verifyChallenge(
  secret: string, difficulty: number, store: RateLimitStore, answer: { id: string; nonce: string }
): Promise<boolean> {
  const parts = answer.id.split(".");
  if (parts.length !== 3) return false;
  const [exp, rnd, mac] = parts as [string, string, string];
  if (!/^\d{10,16}$/.test(exp) || Number(exp) < Date.now()) return false;
  if (!safeEqual(mac, hmacHex(secret, `pow:${exp}.${rnd}`).slice(0, 32))) return false;
  if (!/^[0-9a-z]{1,16}$/.test(answer.nonce)) return false;
  const hash = createHash("sha256").update(`${answer.id}:${answer.nonce}`).digest();
  if (leadingZeroBits(hash) < difficulty) return false;
  return store.setOnce(`pow-used:${answer.id}`, TTL_MS);
}
