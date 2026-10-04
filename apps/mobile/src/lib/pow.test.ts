import { describe, expect, it } from "vitest";
import { solveChallenge } from "@unsaid/api-client";
import { sha256, toHex } from "./sha256";

const leadingZeroBits = (h: Uint8Array) => {
  let bits = 0;
  for (const b of h) { if (b === 0) { bits += 8; continue; } bits += Math.clz32(b) - 24; break; }
  return bits;
};

describe("proof of work with the pure-JS sha256", () => {
  it("finds a nonce with the required leading zero bits", async () => {
    const c = { id: "challenge-id-1", algorithm: "sha256-leading-zero-bits" as const, difficulty: 12, prefix: "unsaid:test:", expiresAt: new Date(Date.now() + 60000).toISOString() };
    const { id, nonce } = await solveChallenge(c, sha256);
    expect(id).toBe(c.id);
    const h = sha256(c.prefix + nonce);
    expect(leadingZeroBits(h)).toBeGreaterThanOrEqual(12);
    expect(toHex(h).startsWith("000")).toBe(true);
  });
});
