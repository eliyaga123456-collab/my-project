import { describe, expect, it } from "vitest";
import { en } from "./en";
import { he } from "./he";
import { dirOf, enumWith, interpolate, labelize, pluralKey, pluralWith, translateWith, type Dicts } from "./core";
import { formatDate, formatNumber, formatPercent, formatRelative, formatUptime, shortDay } from "./format";

const DICTS: Dicts = { en, he };
const enKeys = Object.keys(en);
const heKeys = Object.keys(he);
const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe("dictionary completeness", () => {
  it("he has every en key", () => {
    expect(enKeys.filter((k) => !(k in he))).toEqual([]);
  });
  it("he has no stray keys (only the Hebrew plural 'two' form may be extra)", () => {
    const extra = heKeys.filter((k) => !(k in en));
    for (const k of extra) {
      expect(k.endsWith("_two")).toBe(true);
      expect(`${k.slice(0, -4)}_other` in en).toBe(true);
    }
  });
  it("no empty strings", () => {
    for (const [name, d] of [["en", en], ["he", he]] as const) {
      for (const [k, v] of Object.entries(d)) expect(v.trim(), `${name}:${k}`).not.toBe("");
    }
  });
  it("placeholders match per key", () => {
    for (const k of heKeys) {
      const source = (en as Record<string, string>)[k] ?? (en as Record<string, string>)[k.replace(/_two$/, "_other")]!;
      const a = params(source), b = params((he as Record<string, string>)[k]!);
      // plural keys may drop {n} in singular forms ("one report"), but never add unknown params
      if (/_(one|two)$/.test(k)) expect(b.every((p) => a.includes(p)), k).toBe(true);
      else expect(b, k).toEqual(a);
    }
  });
  it("every plural base has one and other in both languages", () => {
    const bases = enKeys.filter((k) => k.endsWith("_other")).map((k) => k.slice(0, -6));
    for (const b of bases) {
      for (const f of ["one", "other"]) { expect(`${b}_${f}` in en, `en ${b}_${f}`).toBe(true); expect(`${b}_${f}` in he, `he ${b}_${f}`).toBe(true); }
      expect(`${b}_two` in he, `he ${b}_two`).toBe(true);
    }
  });
  it("Hebrew copy contains Hebrew letters", () => {
    for (const k of enKeys.filter((k) => !/^(health\.errors5xx)$/.test(k))) expect((he as Record<string, string>)[k], k).toMatch(/[֐-׿]/);
  });
});

describe("translate / interpolate / plural", () => {
  it("interpolates and falls back to en then key", () => {
    expect(translateWith(DICTS, "en", "overview.openReportsHint", { total: "5" })).toBe("5 total");
    expect(translateWith({ en: { a: "A" }, he: {} }, "he", "a")).toBe("A");
    expect(translateWith(DICTS, "en", "nope.key")).toBe("nope.key");
  });
  it("isolates Latin string params in RTL only", () => {
    expect(interpolate("x {u}", { u: "@bob" }, "en")).toBe("x @bob");
    expect(interpolate("x {u}", { u: "@bob" }, "he")).toBe("x ⁨@bob⁩");
    expect(interpolate("x {n}", { n: 3 }, "he")).toBe("x 3");
  });
  it("uses Hebrew plural categories one / two / other", () => {
    expect(pluralKey(DICTS, "he", "reports.sameSource", 1)).toBe("reports.sameSource_one");
    expect(pluralKey(DICTS, "he", "reports.sameSource", 2)).toBe("reports.sameSource_two");
    expect(pluralKey(DICTS, "he", "reports.sameSource", 5)).toBe("reports.sameSource_other");
    expect(pluralWith(DICTS, "he", "reports.sameSource", 2)).toBe("שני דיווחים מאותו מקור");
    expect(pluralWith(DICTS, "he", "reports.sameSource", 7)).toBe("7 דיווחים מאותו מקור");
  });
  it("English never uses a 'two' form", () => {
    expect(pluralKey(DICTS, "en", "reports.sameSource", 2)).toBe("reports.sameSource_other");
    expect(pluralWith(DICTS, "en", "common.loaded", 1)).toBe("1 loaded, that's everything");
    expect(pluralWith(DICTS, "en", "common.loaded", 1200)).toBe("1,200 loaded, that's everything");
  });
  it("maps enums with a safe fallback", () => {
    expect(enumWith(DICTS, "he", "status", "suspended")).toBe("מושעה");
    expect(enumWith(DICTS, "he", "role", "moderator")).toBe("מודרטור");
    expect(enumWith(DICTS, "he", "audit", "report.ban_user")).toBe("חסימת מקור");
    expect(enumWith(DICTS, "he", "status", "brand_new_value")).toBe("Brand new value");
    expect(enumWith(DICTS, "en", "category", "self_harm")).toBe("Self-harm");
  });
  it("knows direction and labelizes", () => {
    expect(dirOf("he")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
    expect(labelize("a_b")).toBe("A b");
  });
});

describe("Intl formatters", () => {
  it("formats rates", () => {
    expect(formatPercent(0.034, "en")).toBe("3.4%");
    expect(formatPercent(0.5, "en")).toBe("50%");
    expect(formatPercent(0, "en")).toBe("0%");
    expect(formatPercent(Number.NaN, "en")).toBe("–");
    expect(formatPercent(0.034, "he")).toMatch(/3\.4\s?%/);
  });
  it("formats numbers", () => {
    expect(formatNumber(1234.5, "en")).toBe("1,234.5");
    expect(formatNumber(250_000, "en")).toMatch(/250K/);
    expect(formatNumber(Number.NaN, "he")).toBe("–");
  });
  it("formats uptime", () => {
    expect(formatUptime(42, "en")).toBe("42s");
    expect(formatUptime(125, "en")).toBe("2m 5s");
    expect(formatUptime(3 * 3600 + 120, "en")).toBe("3h 2m");
    expect(formatUptime(2 * 86400 + 5 * 3600, "en")).toBe("2d 5h");
    expect(formatUptime(-1, "en")).toBe("–");
    expect(formatUptime(125, "he")).toMatch(/2/);
  });
  it("formats relative time", () => {
    const now = Date.parse("2026-01-10T12:00:00Z");
    expect(formatRelative("2026-01-10T11:59:50Z", "en", now)).toBe("now");
    expect(formatRelative("2026-01-10T11:30:00Z", "en", now)).toMatch(/30 min/);
    expect(formatRelative("2026-01-10T07:00:00Z", "en", now)).toMatch(/5 hr/);
    expect(formatRelative("2026-01-07T12:00:00Z", "en", now)).toMatch(/3 days? ago/);
    expect(formatRelative("2026-01-10T11:30:00Z", "he", now)).toMatch(/30/);
    expect(formatRelative("2026-01-10T11:30:00Z", "he", now)).toMatch(/[֐-׿]/);
    expect(formatRelative(null, "en", now, "never")).toBe("never");
    expect(formatRelative("garbage", "en", now)).toBe("–");
    expect(formatRelative("2025-06-01T00:00:00Z", "en", now)).toBe(formatDate("2025-06-01T00:00:00Z", "en"));
  });
  it("formats dates in both locales", () => {
    expect(formatDate("2026-03-05T12:00:00Z", "en")).toMatch(/Mar/);
    expect(formatDate("2026-03-05T12:00:00Z", "he")).toMatch(/[֐-׿]/);
    expect(shortDay("2026-03-05", "en")).toMatch(/Mar/);
    expect(formatDate(null, "he")).toBe("–");
  });
});
