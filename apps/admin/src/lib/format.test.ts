import { describe, expect, it } from "vitest";
import { allowedUserActions, cleanNote, formatPercent, formatRelative, formatUptime, isStaff, labelize, niceScale, shortId, truncate } from "./format";

describe("formatters", () => {
  it("formats rates", () => {
    expect(formatPercent(0.034)).toBe("3.4%");
    expect(formatPercent(0.5)).toBe("50%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(Number.NaN)).toBe("–");
  });
  it("formats uptime", () => {
    expect(formatUptime(42)).toBe("42s");
    expect(formatUptime(125)).toBe("2m 5s");
    expect(formatUptime(3 * 3600 + 120)).toBe("3h 2m");
    expect(formatUptime(2 * 86400 + 5 * 3600)).toBe("2d 5h");
    expect(formatUptime(-1)).toBe("–");
  });
  it("formats relative time", () => {
    const now = Date.parse("2026-01-10T12:00:00Z");
    expect(formatRelative("2026-01-10T11:59:50Z", now)).toBe("just now");
    expect(formatRelative("2026-01-10T11:30:00Z", now)).toBe("30m ago");
    expect(formatRelative("2026-01-10T07:00:00Z", now)).toBe("5h ago");
    expect(formatRelative("2026-01-07T12:00:00Z", now)).toBe("3d ago");
    expect(formatRelative(null, now)).toBe("never");
    expect(formatRelative("garbage", now)).toBe("–");
  });
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
