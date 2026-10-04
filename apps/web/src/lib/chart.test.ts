import { describe, expect, it } from "vitest";
import { buildChart, formatDay, niceMax } from "./chart";

describe("chart helpers", () => {
  it("niceMax rounds up to friendly numbers", () => {
    expect(niceMax(0)).toBe(4);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(130)).toBe(200);
    expect(niceMax(480)).toBe(500);
  });
  it("buildChart scales values into the plot", () => {
    const c = buildChart([{ date: "2026-10-01", views: 10, messages: 5 }, { date: "2026-10-02", views: 0, messages: 0 }], 200, 100);
    expect(c.max).toBe(10);
    expect(c.bars[0]?.h).toBeCloseTo(50);
    expect(c.bars[1]?.h).toBe(0);
    expect(c.line.startsWith("M")).toBe(true);
  });
  it("formats days in UTC", () => {
    expect(formatDay("2026-10-01")).toBe("Oct 1");
  });
});
