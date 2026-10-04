import { describe, expect, it } from "vitest";
import { fieldErrors, passwordRules, validateEmail, validateMessage, validatePassword, validateUsername } from "./validation";

describe("validation wrappers", () => {
  it("username", () => {
    expect(validateUsername(" Ada_L ")).toEqual({ ok: true, value: "ada_l" });
    expect(validateUsername("ab").ok).toBe(false);
    expect(validateUsername("admin").ok).toBe(false);
    expect(validateUsername("_bad").ok).toBe(false);
    expect(validateUsername("has space").ok).toBe(false);
  });
  it("email", () => {
    expect(validateEmail(" A@B.co ")).toEqual({ ok: true, value: "a@b.co" });
    expect(validateEmail("nope").ok).toBe(false);
  });
  it("password and rules", () => {
    expect(validatePassword("short1").ok).toBe(false);
    expect(validatePassword("longenough1").ok).toBe(true);
    const r = passwordRules("abcdefghij");
    expect(r.find((x) => x.id === "len")!.met).toBe(true);
    expect(r.find((x) => x.id === "mix")!.met).toBe(false);
    expect(passwordRules("").every((x) => !x.met)).toBe(true);
  });
  it("message", () => {
    expect(validateMessage("a").ok).toBe(false);
    expect(validateMessage("  hello there  ")).toEqual({ ok: true, value: "hello there" });
    expect(validateMessage("x".repeat(501)).ok).toBe(false);
  });
  it("fieldErrors", () => {
    expect(fieldErrors({ details: { email: ["bad email"], x: 3 } })).toEqual({ email: "bad email" });
    expect(fieldErrors({ details: undefined })).toEqual({});
  });
});
