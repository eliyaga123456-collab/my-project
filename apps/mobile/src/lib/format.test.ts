import { describe, expect, it } from "vitest";
import { countLabel, describeUserAgent, initials, parseProfilePath, pluralize, publicLink, remainingChars, timeAgo } from "./format";

const now = new Date("2026-06-15T12:00:00Z").getTime();
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("format", () => {
  it("timeAgo", () => {
    expect(timeAgo(ago(10_000), now)).toBe("just now");
    expect(timeAgo(ago(5 * 60_000), now)).toBe("5m ago");
    expect(timeAgo(ago(3 * 3600_000), now)).toBe("3h ago");
    expect(timeAgo(ago(2 * 86400_000), now)).toBe("2d ago");
    expect(timeAgo(ago(30 * 86400_000), now)).toMatch(/May/);
    expect(timeAgo("nope", now)).toBe("");
  });
  it("initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("  mono ")).toBe("M");
    expect(initials("")).toBe("?");
  });
  it("counts and plurals", () => {
    expect(countLabel(999)).toBe("999");
    expect(countLabel(1500)).toBe("1.5k");
    expect(countLabel(2_000_000)).toBe("2M");
    expect(pluralize(1, "message")).toBe("1 message");
    expect(pluralize(2, "message")).toBe("2 messages");
  });
  it("remainingChars counts code points", () => {
    expect(remainingChars("ab😀", 10)).toBe(7);
  });
  it("links", () => {
    expect(publicLink("https://x.test/", "ada")).toBe("https://x.test/u/ada");
    expect(parseProfilePath("/u/ada_1")).toEqual({ kind: "u", value: "ada_1" });
    expect(parseProfilePath("l/abcd-1234/")).toEqual({ kind: "l", value: "abcd-1234" });
    expect(parseProfilePath("/a/123")).toBeNull();
  });
  it("describeUserAgent", () => {
    expect(describeUserAgent(null)).toBe("Unknown device");
    expect(describeUserAgent("okhttp/4.9")).toBe("Android device");
    expect(describeUserAgent("Mozilla/5.0 Chrome/120")).toBe("Web browser");
  });
});
