import { describe, expect, it } from "vitest";
import { fallbackStrings } from "./fallbackText";
import { makeGlobalHandler } from "./globalErrors";

describe("fallbackStrings", () => {
  it("picks Hebrew for he/iw and English otherwise", () => {
    expect(fallbackStrings("he").rtl).toBe(true);
    expect(fallbackStrings("iw-IL").retry).toBe("נסו שוב");
    expect(fallbackStrings("fr").retry).toBe("Try again");
    expect(fallbackStrings(null).title).toBe("Something went wrong");
  });
});

describe("global error handler", () => {
  it("logs and swallows non-fatal errors in release", () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const calls: unknown[] = [];
    const logged: unknown[][] = [];
    const h = makeGlobalHandler((e) => calls.push(e), (...a) => logged.push(a));
    h(new Error("x"), false);
    expect(calls).toHaveLength(0);
    expect(logged).toHaveLength(1);
    h(new Error("fatal"), true);
    expect(calls).toHaveLength(1);
  });
});
