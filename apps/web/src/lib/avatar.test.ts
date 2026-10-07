import { describe, expect, it } from "vitest";
import { clampCrop, clampTrim, cropSource, normalizeWhatsapp, pinchZoom, pointerDistance, whatsappUrl } from "./avatar";

describe("normalizeWhatsapp", () => {
  it("strips formatting and plus", () => expect(normalizeWhatsapp("+972 50-123 4567")).toBe("972501234567"));
  it("handles 00 prefix", () => expect(normalizeWhatsapp("0044 7700 900123")).toBe("447700900123"));
  it("converts local Israeli mobiles", () => expect(normalizeWhatsapp("050-123-4567")).toBe("972501234567"));
  it("rejects junk and too short/long", () => {
    expect(normalizeWhatsapp("abc")).toBeNull();
    expect(normalizeWhatsapp("12345")).toBeNull();
    expect(normalizeWhatsapp("1234567890123456")).toBeNull();
  });
  it("builds wa.me url", () => expect(whatsappUrl("972501234567")).toBe("https://wa.me/972501234567"));
});

describe("crop math", () => {
  it("full square image at zoom 1 selects whole image", () => {
    expect(cropSource({ zoom: 1, x: 0, y: 0 }, 400, 400, 200)).toEqual({ sx: 0, sy: 0, size: 400 });
  });
  it("landscape image centred selects centre square", () => {
    const r = cropSource({ zoom: 1, x: 0, y: 0 }, 800, 400, 200);
    expect(r.sx).toBe(200); expect(r.sy).toBe(0); expect(r.size).toBe(400);
  });
  it("zoom 2 halves the source size", () => {
    expect(cropSource({ zoom: 2, x: 0, y: 0 }, 400, 400, 200).size).toBe(200);
  });
  it("clamps panning inside the image", () => {
    const c = clampCrop({ zoom: 1, x: 999, y: 999 }, 800, 400, 200);
    expect(c.y).toBe(0); expect(c.x).toBe(100);
    const r = cropSource({ zoom: 1, x: 999, y: 0 }, 800, 400, 200);
    expect(r.sx).toBe(0);
  });
  it("clamps zoom range", () => {
    expect(clampCrop({ zoom: 99, x: 0, y: 0 }, 400, 400, 200).zoom).toBe(4);
    expect(clampCrop({ zoom: 0.2, x: 0, y: 0 }, 400, 400, 200).zoom).toBe(1);
  });
});

describe("clampTrim", () => {
  it("caps at 5s", () => expect(clampTrim(0, 12, 60)).toEqual({ start: 0, duration: 5 }));
  it("keeps window inside clip", () => expect(clampTrim(58, 5, 60)).toEqual({ start: 55, duration: 5 }));
  it("short clip", () => expect(clampTrim(1, 5, 3)).toEqual({ start: 0, duration: 3 }));
});

describe("crop robustness", () => {
  it("portrait image pans only vertically", () => {
    const c = clampCrop({ zoom: 1, x: 500, y: 500 }, 400, 800, 200);
    expect(c.x).toBe(0); expect(c.y).toBe(100);
  });
  it("source square always stays inside the image", () => {
    for (const [w, h] of [[800, 400], [400, 800], [1000, 1000], [4000, 3000]] as const) {
      for (const z of [1, 1.7, 4]) for (const o of [-9999, 0, 9999]) {
        const r = cropSource({ zoom: z, x: o, y: o }, w, h, 260);
        expect(r.sx).toBeGreaterThanOrEqual(-1e-6); expect(r.sy).toBeGreaterThanOrEqual(-1e-6);
        expect(r.sx + r.size).toBeLessThanOrEqual(w + 1e-6); expect(r.sy + r.size).toBeLessThanOrEqual(h + 1e-6);
      }
    }
  });
  it("tiny image still yields a valid square", () => {
    const r = cropSource({ zoom: 1, x: 0, y: 0 }, 50, 50, 260);
    expect(r).toEqual({ sx: 0, sy: 0, size: 50 });
  });
});

describe("pinch", () => {
  it("distance", () => expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5));
  it("spreading zooms in, pinching zooms out, clamped", () => {
    expect(pinchZoom(1, 100, 200)).toBe(2);
    expect(pinchZoom(2, 100, 50)).toBe(1);
    expect(pinchZoom(2, 100, 5000)).toBe(4);
    expect(pinchZoom(1.5, 0, 100)).toBe(1.5);
  });
});
