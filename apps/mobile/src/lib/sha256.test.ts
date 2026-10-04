import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256, toHex, utf8Bytes } from "./sha256";

const ref = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

describe("sha256", () => {
  it("matches known vectors", () => {
    expect(toHex(sha256(""))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(toHex(sha256("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("matches node crypto across lengths and unicode", () => {
    for (const s of ["a".repeat(55), "a".repeat(56), "a".repeat(63), "a".repeat(64), "a".repeat(65), "a".repeat(1000), "héllo wörld ✓", "😀 emoji 𝒳", "prefix:abc123"]) {
      expect(toHex(sha256(s))).toBe(ref(s));
    }
  });
  it("encodes utf8 like TextEncoder", () => {
    const s = "añ€😀";
    expect(Array.from(utf8Bytes(s))).toEqual(Array.from(new TextEncoder().encode(s)));
  });
});
