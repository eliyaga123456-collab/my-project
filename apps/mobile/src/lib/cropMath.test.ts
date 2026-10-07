import { describe, expect, it } from "vitest";
import { clampOffset, clampScale, coverSize, fractionToZoom, maxOffset, zoomToFraction } from "./cropMath";

describe("cropMath", () => {
  it("covers the square for landscape and portrait", () => {
    expect(coverSize(2000, 1000, 300)).toEqual({ iw: 600, ih: 300 });
    expect(coverSize(1000, 2000, 300)).toEqual({ iw: 300, ih: 600 });
    const s = coverSize(0, 0, 300);
    expect(s.iw).toBe(300);
  });
  it("clamps scale", () => {
    expect(clampScale(0.2)).toBe(1);
    expect(clampScale(99)).toBe(6);
    expect(clampScale(NaN)).toBe(1);
  });
  it("computes max offsets", () => {
    expect(maxOffset(600, 300, 1, 300)).toEqual({ mx: 150, my: 0 });
    expect(maxOffset(600, 300, 2, 300)).toEqual({ mx: 450, my: 150 });
  });
  it("clamps offsets so the circle stays filled", () => {
    const c = clampOffset(500, -500, 600, 300, 1, 300);
    expect(c.x).toBe(150);
    expect(Math.abs(c.y)).toBe(0);
    const d = clampOffset(10, 10, 300, 300, 1, 300);
    expect(Math.abs(d.x) + Math.abs(d.y)).toBe(0);
  });
  it("maps slider fraction", () => {
    expect(fractionToZoom(0)).toBe(1);
    expect(fractionToZoom(1)).toBe(6);
    expect(zoomToFraction(3.5)).toBeCloseTo(0.5);
    expect(fractionToZoom(2)).toBe(6);
  });
});
