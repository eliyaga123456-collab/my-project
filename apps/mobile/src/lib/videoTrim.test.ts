import { describe, expect, it } from "vitest";
import { clampTrim } from "./videoTrim";

describe("clampTrim", () => {
  it("caps the length at 5 seconds", () => expect(clampTrim(0, 9, 30)).toEqual({ start: 0, duration: 5 }));
  it("keeps the window inside the clip", () => expect(clampTrim(9, 5, 10)).toEqual({ start: 9, duration: 1 }));
  it("never goes negative", () => expect(clampTrim(-3, 0, null)).toEqual({ start: 0, duration: 0.5 }));
});
