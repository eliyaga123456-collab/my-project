/**
 * Pure i18n core (no React Native imports, so it is unit-testable under node).
 * The React provider in ./index.tsx and non-React code (errors, validation) both build on this.
 */
import { DEFAULT_LOCALE, LOCALES, RTL_LOCALES, type Locale } from "@unsaid/shared";
import { en, type Dict, type Key } from "./en";
import { he } from "./he";

export { LOCALES, DEFAULT_LOCALE };
export type { Locale, Key, Dict };
export const DICTIONARIES: Record<Locale, Dict> = { en: en as unknown as Dict, he };

export type Params = Record<string, string | number>;

/** First-strong isolate: keeps `@names`, emails, URLs and numbers from reordering the surrounding RTL sentence. */
export const FSI = "⁨";
/** Left-to-right isolate, for fixed LTR tokens such as the "EAR*" wordmark. */
export const LRI = "⁦";
export const PDI = "⁩";
export const isolate = (s: string): string => `${FSI}${s}${PDI}`;
export const ltrIsolate = (s: string): string => `${LRI}${s}${PDI}`;
/** Removes the isolate marks again (e.g. before copying text to the clipboard). */
export const stripIsolates = (s: string): string => s.replace(/[⁦-⁩]/g, "");

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);
export const isRtlLocale = (l: Locale): boolean => RTL_LOCALES.includes(l);

/** Device language code ("he-IL", "iw", "en-US") -> supported locale. Hebrew -> "he", anything else -> English. */
export function localeFromDevice(code: string | null | undefined): Locale {
  const base = (code ?? "").toLowerCase().split(/[-_]/)[0];
  return base === "he" || base === "iw" ? "he" : DEFAULT_LOCALE;
}

type PluralNode = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;
const isPlural = (n: unknown): n is PluralNode => typeof n === "object" && n !== null && typeof (n as PluralNode).other === "string";

const rulesCache = new Map<string, Intl.PluralRules>();
/** Plural category for `n` ("one" | "two" | "many" | "other" ... as defined by CLDR for that language). */
export function pluralCategory(locale: Locale, n: number): Intl.LDMLPluralRule {
  let r = rulesCache.get(locale);
  if (!r) { r = new Intl.PluralRules(locale); rulesCache.set(locale, r); }
  return r.select(n);
}

/** Picks the right form of a plural group, falling back to `other`. */
export function pickPlural(locale: Locale, node: PluralNode, n: number): string {
  return node[pluralCategory(locale, n)] ?? node.other;
}

function lookup(dict: Dict, key: string): unknown {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export interface Translator {
  locale: Locale;
  /** True when the language itself is right-to-left (not necessarily the native layout direction, which needs a reload). */
  isRTL: boolean;
  t: (key: Key, params?: Params) => string;
  formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
  formatDate: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string;
  /** "just now" / "5m ago" / "לפני 5 דקות" for an ISO timestamp; older than a week falls back to a short date. */
  formatRelative: (iso: string, now?: number) => string;
}

export function createTranslator(locale: Locale): Translator {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  const rtl = isRtlLocale(locale);

  const formatNumber: Translator["formatNumber"] = (n, opts) => {
    try { return new Intl.NumberFormat(locale, opts).format(n); } catch { return String(n); }
  };
  const formatDate: Translator["formatDate"] = (d, opts = { month: "short", day: "numeric" }) => {
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return "";
    try { return new Intl.DateTimeFormat(locale, opts).format(date); } catch { return date.toDateString(); }
  };

  const t: Translator["t"] = (key, params) => {
    let node = lookup(dict, key);
    if (node === undefined) node = lookup(DICTIONARIES[DEFAULT_LOCALE], key);
    if (isPlural(node)) {
      const count = typeof params?.count === "number" ? params.count : Number(params?.count ?? 1);
      node = pickPlural(locale, node, count);
    }
    if (typeof node !== "string") return key;
    if (!params) return node;
    return node.replace(/\{(\w+)\}/g, (m, name: string) => {
      const v = params[name];
      if (v === undefined) return m;
      if (typeof v === "number") return formatNumber(v);
      return rtl ? isolate(v) : v;
    });
  };

  const formatRelative: Translator["formatRelative"] = (iso, now = Date.now()) => {
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts)) return "";
    const s = Math.max(0, Math.floor((now - ts) / 1000));
    if (s < 45) return t("time.justNow");
    const m = Math.round(s / 60);
    if (m < 60) return t("time.minutes", { count: m });
    const h = Math.round(m / 60);
    if (h < 24) return t("time.hours", { count: h });
    const d = Math.round(h / 24);
    if (d < 7) return t("time.days", { count: d });
    const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear();
    return formatDate(ts, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  };

  return { locale, isRTL: rtl, t, formatNumber, formatDate, formatRelative };
}

// ---------- runtime singleton for non-React code (errors, validation, push channel names) ----------
let current: Translator = createTranslator(DEFAULT_LOCALE);
export const setRuntimeLocale = (l: Locale): Translator => (current = createTranslator(l));
export const runtime = (): Translator => current;
/** Translate with the currently active language outside of React. */
export const translate: Translator["t"] = (key, params) => current.t(key, params);
