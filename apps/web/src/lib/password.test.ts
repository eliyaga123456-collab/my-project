import { describe, expect, it } from "vitest";
import { passwordAcceptable, passwordRules } from "./password";

describe("password rules", () => {
  it("reports each rule", () => {
    const r = passwordRules("short");
    expect(r.find((x) => x.id === "len")?.ok).toBe(false);
    expect(passwordRules("longenough1").every((x) => x.ok)).toBe(true);
  });
  it("accepts by length only", () => {
    expect(passwordAcceptable("aaaaaaaaaa")).toBe(true);
    expect(passwordAcceptable("aaa")).toBe(false);
    expect(passwordAcceptable("a".repeat(129))).toBe(false);
  });
});
