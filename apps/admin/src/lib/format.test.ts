import { describe, expect, it } from "vitest";
import { allowedUserActions, cleanNote, isStaff, labelize, niceScale, shortId, truncate, whatsappLink } from "./format";

describe("formatters", () => {
  it("labelizes and truncates", () => {
    expect(labelize("self_harm")).toBe("Self harm");
    expect(labelize("user.ban")).toBe("User ban");
    expect(shortId("123e4567-e89b-12d3")).toBe("123e4567…");
    expect(shortId(null)).toBe("–");
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
  });
  it("cleans notes", () => {
    expect(cleanNote("   ")).toBeUndefined();
    expect(cleanNote("  hi ")).toBe("hi");
    expect(cleanNote("x".repeat(900))?.length).toBe(500);
  });
});

describe("permissions", () => {
  it("identifies staff", () => {
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("moderator")).toBe(true);
    expect(isStaff("user")).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });
  it("limits actions by role and status", () => {
    expect(allowedUserActions("moderator", "active")).toEqual(["suspend"]);
    expect(allowedUserActions("moderator", "suspended")).toEqual(["unsuspend"]);
    expect(allowedUserActions("moderator", "banned")).toEqual([]);
    expect(allowedUserActions("admin", "active")).toEqual(["suspend", "ban"]);
    expect(allowedUserActions("admin", "suspended")).toEqual(["unsuspend", "ban"]);
    expect(allowedUserActions("admin", "banned")).toEqual(["unban"]);
    expect(allowedUserActions("user", "active")).toEqual([]);
  });
});

describe("niceScale", () => {
  it("rounds up to nice bounds", () => {
    expect(niceScale(37).max).toBe(40);
    expect(niceScale(37).ticks).toEqual([0, 10, 20, 30, 40]);
    expect(niceScale(0).max).toBe(4);
    expect(niceScale(1234).max).toBe(2000);
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link from digits only", () => {
    expect(whatsappLink("+972 50-123-4567")).toBe("https://wa.me/972501234567");
  });
  it("returns null when missing or too short", () => {
    expect(whatsappLink(null)).toBeNull();
    expect(whatsappLink("")).toBeNull();
    expect(whatsappLink("12")).toBeNull();
  });
});
