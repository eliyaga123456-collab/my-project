import { describe, expect, it } from "vitest";
import { LOCALES } from "@unsaid/shared";
import {
  DICTIONARIES, createTranslator, FSI, PDI, LRI, isolate, ltrIsolate, stripIsolates, isPlural, localeFromDevice, pickPlural, pluralCategory,
  isRtlLocale, setRuntimeLocale, translate, type Locale
} from "./core";
import { en } from "./en";
import { he } from "./he";
import { validateEmail, validateUsername, validatePassword, validateMessage, passwordRules } from "../lib/validation";

type Node = string | { [k: string]: Node };
/** Flattens a dictionary to dotted path -> leaf; plural groups are kept as one entry (path -> object). */
function flatten(node: Node, prefix = "", out: Record<string, string | Record<string, string>> = {}) {
  for (const [k, v] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[path] = v;
    else if (isPlural(v)) out[path] = v as Record<string, string>;
    else flatten(v, path, out);
  }
  return out;
}
const params = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!));
const forms = (v: string | Record<string, string>) => (typeof v === "string" ? [v] : Object.values(v));
const paramsOf = (v: string | Record<string, string>) => new Set(forms(v).flatMap((s) => [...params(s)]));

const E = flatten(en as unknown as Node);
const H = flatten(he as unknown as Node);

describe("dictionaries", () => {
  it("every supported locale has a dictionary", () => {
    for (const l of LOCALES) expect(DICTIONARIES[l]).toBeDefined();
  });
  it("he has exactly the keys of en (same plural groups)", () => {
    expect(Object.keys(H).sort()).toEqual(Object.keys(E).sort());
    for (const k of Object.keys(E)) expect(typeof H[k], k).toBe(typeof E[k]);
  });
  it("no empty strings in any language", () => {
    for (const [name, d] of [["en", E], ["he", H]] as const) {
      for (const [k, v] of Object.entries(d)) for (const s of forms(v)) expect(s.trim().length, `${name}:${k}`).toBeGreaterThan(0);
    }
  });
  it("placeholders match between languages", () => {
    for (const k of Object.keys(E)) {
      const e = paramsOf(E[k]!);
      const h = paramsOf(H[k]!);
      // a Hebrew singular/dual form may drop {count} ("הודעה אחת"), but never invent or lose any other placeholder
      for (const p of h) expect(e.has(p), `${k}: he uses {${p}} missing in en`).toBe(true);
      for (const p of e) expect(h.has(p), `${k}: en uses {${p}} missing in he`).toBe(true);
    }
  });
  it("non-plural strings have identical placeholders in both languages", () => {
    for (const k of Object.keys(E)) if (typeof E[k] === "string") expect(params(H[k] as string), k).toEqual(params(E[k] as string));
  });
  it("Hebrew plural groups cover every category Intl.PluralRules('he') can return", () => {
    const cats = new Set([1, 2, 3, 5, 10, 11, 20, 100].map((n) => pluralCategory("he", n)));
    for (const [k, v] of Object.entries(H)) {
      if (typeof v === "string") continue;
      expect(v.other, k).toBeTruthy();
      for (const c of cats) if (c !== "other") expect(v[c], `${k} needs ${c}`).toBeTruthy();
    }
  });
  it("brand, tagline and dedication follow the spec", () => {
    expect(en.brand.tagline).toBe("Say what you really think.");
    expect(he.brand.tagline).toBe("תגידו מה אתם באמת חושבים.");
    expect(en.brand.dedication).toBe("* For Liron 💛");
    expect(he.brand.dedication).toBe("* ללירון 💛");
    expect(he.brand.name).toBe("EAR");
  });
  it("Hebrew copy uses the agreed vocabulary and no masculine-only 'אתה'", () => {
    const text = Object.values(H).flatMap(forms).join("\n");
    expect(text).not.toMatch(/(^|\s)אתה(\s|$)/);
    expect(he.inbox.segments.filtered).toBe("מסוננות");
    expect(he.inbox.segments.archived).toBe("ארכיון");
    expect(he.inbox.title).toBe("תיבת הודעות");
    expect(he.share.startRound).toContain("סבב");
  });
  it("Hebrew copy has no Latin letters except EAR / technical names", () => {
    const allowed = /EAR|iOS|JPEG|PNG|WebP|MB/g;
    for (const [k, v] of Object.entries(H)) {
      for (const s of forms(v)) {
        const rest = s.replace(/\{\w+\}/g, "").replace(allowed, "");
        // "Language" / "English" labels are intentionally bilingual and live in code, not in the dictionary
        expect(rest, `${k}: ${s}`).not.toMatch(/[A-Za-z]/);
      }
    }
  });
});

describe("plural logic", () => {
  it("Hebrew categories", () => {
    expect(pluralCategory("he", 1)).toBe("one");
    expect(pluralCategory("he", 2)).toBe("two");
    expect(pluralCategory("he", 11)).toBe("other");
  });
  it("Hebrew messages: one / two / many", () => {
    const t = createTranslator("he").t;
    expect(t("share.messages", { count: 1 })).toBe("הודעה אחת");
    expect(t("share.messages", { count: 2 })).toBe("שתי הודעות");
    expect(t("share.messages", { count: 11 })).toBe("11 הודעות");
    expect(t("time.minutes", { count: 5 })).toBe("לפני 5 דקות");
    expect(t("time.hours", { count: 2 })).toBe("לפני שעתיים");
  });
  it("English one / other", () => {
    const t = createTranslator("en").t;
    expect(t("share.messages", { count: 1 })).toBe("1 message");
    expect(t("share.messages", { count: 0 })).toBe("0 messages");
    expect(t("share.messages", { count: 2 })).toBe("2 messages");
  });
  it("falls back to `other` for a missing category", () => {
    expect(pickPlural("he", { other: "x" }, 2)).toBe("x");
    expect(pickPlural("he", { one: "a", other: "x" }, 1)).toBe("a");
  });
  it("thousands are grouped by locale", () => {
    expect(createTranslator("en").t("share.views", { count: 1500 })).toBe("1,500 views");
  });
});

describe("interpolation and isolates", () => {
  it("isolate wraps in FSI/PDI and can be stripped", () => {
    expect(isolate("@eliya")).toBe(`${FSI}@eliya${PDI}`);
    expect(FSI).toBe("⁨");
    expect(PDI).toBe("⁩");
    expect(stripIsolates(isolate("a") + ltrIsolate("b"))).toBe("ab");
    expect(ltrIsolate("EAR*")).toBe(`${LRI}EAR*${PDI}`);
  });
  it("Hebrew isolates string params (so @names, emails, URLs don't scramble the sentence)", () => {
    const he = createTranslator("he");
    expect(he.t("me.signedInAs", { email: "a@b.co" })).toBe(`מחוברים בתור ${FSI}a@b.co${PDI}`);
    expect(createTranslator("en").t("me.signedInAs", { email: "a@b.co" })).toBe("Signed in as a@b.co");
  });
  it("unknown params stay as placeholders; unknown keys return the key", () => {
    expect(createTranslator("en").t("me.signedInAs")).toBe("Signed in as {email}");
    expect(createTranslator("en").t("nope.nothing" as never)).toBe("nope.nothing");
  });
});

describe("locale helpers", () => {
  it("device language mapping", () => {
    expect(localeFromDevice("he")).toBe("he");
    expect(localeFromDevice("he-IL")).toBe("he");
    expect(localeFromDevice("iw")).toBe("he");
    expect(localeFromDevice("en-US")).toBe("en");
    expect(localeFromDevice("fr")).toBe("en");
    expect(localeFromDevice(null)).toBe("en");
  });
  it("RTL flag", () => {
    expect(isRtlLocale("he")).toBe(true);
    expect(isRtlLocale("en")).toBe(false);
    expect(createTranslator("he").isRTL).toBe(true);
  });
  it("runtime translator follows setRuntimeLocale", () => {
    setRuntimeLocale("he");
    expect(translate("common.cancel")).toBe("ביטול");
    setRuntimeLocale("en");
    expect(translate("common.cancel")).toBe("Cancel");
  });
});

describe("formatters", () => {
  const now = new Date("2026-06-15T12:00:00Z").getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const rel = (l: Locale, ms: number) => createTranslator(l).formatRelative(ago(ms), now);
  it("relative time, English", () => {
    expect(rel("en", 10_000)).toBe("just now");
    expect(rel("en", 5 * 60_000)).toBe("5m ago");
    expect(rel("en", 3 * 3600_000)).toBe("3h ago");
    expect(rel("en", 2 * 86400_000)).toBe("2d ago");
    expect(rel("en", 30 * 86400_000)).toMatch(/May/);
    expect(createTranslator("en").formatRelative("nope", now)).toBe("");
  });
  it("relative time, Hebrew", () => {
    expect(rel("he", 10_000)).toBe("הרגע");
    expect(rel("he", 60_000)).toBe("לפני דקה");
    expect(rel("he", 2 * 60_000)).toBe("לפני שתי דקות");
    expect(rel("he", 5 * 60_000)).toBe("לפני 5 דקות");
    expect(rel("he", 3 * 3600_000)).toBe("לפני 3 שעות");
    expect(rel("he", 24 * 3600_000)).toBe("אתמול");
    expect(rel("he", 3 * 86400_000)).toBe("לפני 3 ימים");
  });
  it("old dates use the locale's month names", () => {
    expect(rel("he", 30 * 86400_000)).toMatch(/מאי|במאי/);
  });
  it("formatNumber and formatDate use the locale", () => {
    expect(createTranslator("en").formatNumber(1234567)).toBe("1,234,567");
    expect(createTranslator("he").formatNumber(1234567)).toBe("1,234,567");
    expect(createTranslator("he").formatDate("2026-03-05T12:00:00Z", { month: "long", timeZone: "UTC" })).toBe("מרץ");
    expect(createTranslator("en").formatDate("2026-03-05T12:00:00Z", { month: "long", timeZone: "UTC" })).toBe("March");
    expect(createTranslator("en").formatDate("garbage")).toBe("");
  });
});

describe("localised validation (runtime language)", () => {
  it("returns Hebrew when the runtime language is Hebrew", () => {
    setRuntimeLocale("he");
    expect(validateEmail("nope")).toEqual({ ok: false, error: "הזינו כתובת אימייל תקינה" });
    const u = validateUsername("ab");
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.error).toMatch(/לפחות 3 תווים/);
    const bad = validateUsername("has space");
    if (!bad.ok) expect(bad.error).toBe("אותיות באנגלית, מספרים וקו תחתון בלבד");
    const p = validatePassword("short");
    if (!p.ok) expect(p.error).toMatch(/לפחות 10 תווים/);
    const m = validateMessage("a");
    if (!m.ok) expect(m.error).toBe("כתבו עוד קצת");
    expect(passwordRules("").map((r) => r.label)[0]).toBe("לפחות 10 תווים");
    setRuntimeLocale("en");
    const e = validateUsername("ab");
    if (!e.ok) expect(e.error).toBe("Username must be at least 3 characters");
  });
});
