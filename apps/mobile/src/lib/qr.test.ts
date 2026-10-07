import { describe, expect, it } from "vitest";
import { qrMatrix } from "./qr";

describe("qrMatrix", () => {
  it("builds a square matrix with finder patterns", () => {
    const m = qrMatrix("https://ear.example/u/eliya");
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(m.every((r) => r.length === m.length)).toBe(true);
    expect(m[0]![0]).toBe(true);
  });
});
