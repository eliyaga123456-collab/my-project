import { describe, expect, it } from "vitest";
import { clampCrop, clampTrim, cropSource, normalizeWhatsapp, whatsappUrl } from "./avatar";

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
