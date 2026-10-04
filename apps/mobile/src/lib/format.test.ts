import { describe, expect, it } from "vitest";
import { countLabel, describeUserAgent, initials, parseProfilePath, publicLink, remainingChars } from "./format";

describe("format", () => {
  it("initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("  mono ")).toBe("M");
    expect(initials("")).toBe("?");
  });
  it("counts and plurals", () => {
    expect(countLabel(999)).toBe("999");
    expect(countLabel(1500)).toBe("1.5k");
    expect(countLabel(2_000_000)).toBe("2M");
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
    expect(describeUserAgent(null).kind).toBe("unknown");
    expect(describeUserAgent("okhttp/4.9").kind).toBe("android");
    expect(describeUserAgent("Mozilla/5.0 Chrome/120").kind).toBe("web");
    expect(describeUserAgent("curl/8")).toEqual({ kind: "other", raw: "curl/8" });
  });
});
