import { describe, expect, it } from "vitest";
import { compactNumber, hueFor, initials, mediaSrc, pluralize, safeNext, shortUserAgent, timeAgo } from "./format";

const NOW = Date.parse("2026-10-04T12:00:00Z");

describe("timeAgo", () => {
  it("formats recent times", () => {
    expect(timeAgo("2026-10-04T11:59:40Z", NOW)).toBe("just now");
    expect(timeAgo("2026-10-04T11:15:00Z", NOW)).toBe("45m ago");
    expect(timeAgo("2026-10-04T07:00:00Z", NOW)).toBe("5h ago");
    expect(timeAgo("2026-10-01T12:00:00Z", NOW)).toBe("3d ago");
  });
  it("handles future and invalid input", () => {
    expect(timeAgo("2026-10-05T12:00:00Z", NOW)).toBe("just now");
    expect(timeAgo("nope", NOW)).toBe("");
  });
});

describe("initials", () => {
  it("takes first and last word", () => {
    expect(initials("Mara Vale")).toBe("MV");
    expect(initials("  solo ")).toBe("S");
    expect(initials("Ana Maria Lopez")).toBe("AL");
    expect(initials("")).toBe("?");
  });
});

describe("compactNumber / pluralize", () => {
  it("compacts", () => {
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(1200)).toBe("1.2k");
    expect(compactNumber(15000)).toBe("15k");
    expect(compactNumber(2_500_000)).toBe("2.5m");
  });
  it("pluralizes", () => {
    expect(pluralize(1, "link")).toBe("1 link");
    expect(pluralize(3, "link")).toBe("3 links");
  });
});

describe("mediaSrc", () => {
  it("keeps relative and strips API origin", () => {
    expect(mediaSrc("/media/abc.png")).toBe("/media/abc.png");
    expect(mediaSrc("http://localhost:4000/media/abc.png")).toBe("/media/abc.png");
    expect(mediaSrc(null)).toBeNull();
    expect(mediaSrc("not a url")).toBeNull();
  });
});

describe("safeNext", () => {
  it("blocks open redirects", () => {
    expect(safeNext("/inbox")).toBe("/inbox");
    expect(safeNext("//evil.com")).toBe("/inbox");
    expect(safeNext("https://evil.com")).toBe("/inbox");
    expect(safeNext("/\\evil.com")).toBe("/inbox");
    expect(safeNext(undefined, "/x")).toBe("/x");
  });
});

describe("misc", () => {
  it("hueFor is deterministic and bounded", () => {
    expect(hueFor("a")).toBe(hueFor("a"));
    expect(hueFor("zzzz")).toBeLessThan(360);
  });
  it("shortUserAgent", () => {
    expect(shortUserAgent("Mozilla/5.0 (X11; Linux x86_64) Chrome/120 Safari/537")).toBe("Chrome on Linux");
    expect(shortUserAgent(null)).toBe("Unknown device");
  });
});
