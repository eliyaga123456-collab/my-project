import { DEFAULT_LOCALE, LOCALES, RTL_LOCALES, type Locale } from "@unsaid/shared";
import type { en } from "./en";

export type Key = keyof typeof en;
/** "chart.aria_other" -> "chart.aria" */
export type PluralBase = Key extends infer K ? (K extends `${infer B}_other` ? B : never) : never;
/** Hebrew has an extra "two" form; English never uses it. */
export type Dict = Record<Key, string> & Partial<Record<`${PluralBase}_two`, string>>;
export type Params = Record<string, string | number>;

export const STORAGE_KEY = "ear-admin-locale";
const FSI = "⁨", PDI = "⁩";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}
export function dirOf(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

/** Stored choice first, then the browser language (he or iw -> he), else the default. */
export function detectLocale(): Locale {
  try { const s = localStorage.getItem(STORAGE_KEY); if (isLocale(s)) return s; } catch { /* storage unavailable */ }
  try {
    const langs = typeof navigator !== "undefined" ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [];
    const first = (langs[0] ?? "").toLowerCase();
    if (first.startsWith("he") || first.startsWith("iw")) return "he";
  } catch { /* ignore */ }
  return DEFAULT_LOCALE;
}
export function storeLocale(locale: Locale): void {
  try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
}

let current: Locale = DEFAULT_LOCALE;
export function getCurrentLocale(): Locale { return current; }
export function setCurrentLocale(l: Locale): void { current = l; }

export type Dicts = Record<Locale, Record<string, string>>;

/** Replaces {name} placeholders. In RTL, string params are wrapped in bidi isolates so @names/emails keep their own direction. */
export function interpolate(template: string, params: Params | undefined, locale: Locale): string {
  if (!params) return template;
  const rtl = dirOf(locale) === "rtl";
  return template.replace(/\{(\w+)\}/g, (m, name: string) => {
    if (!(name in params)) return m;
    const v = params[name]!;
    return rtl && typeof v === "string" && v ? `${FSI}${v}${PDI}` : String(v);
  });
}

export function translateWith(dicts: Dicts, locale: Locale, key: string, params?: Params): string {
  const tpl = dicts[locale]?.[key] ?? dicts[DEFAULT_LOCALE]?.[key] ?? key;
  return interpolate(tpl, params, locale);
}

/** Picks the plural form (`<base>_one|_two|_other`) for `count` using Intl.PluralRules; `{n}` is the formatted count. */
export function pluralKey(dicts: Dicts, locale: Locale, base: string, count: number): string {
  let cat: string;
  try { cat = new Intl.PluralRules(locale).select(count); } catch { cat = "other"; }
  const k = `${base}_${cat}`;
  return dicts[locale]?.[k] !== undefined ? k : `${base}_other`;
}
export function pluralWith(dicts: Dicts, locale: Locale, base: string, count: number, params?: Params): string {
  const n = new Intl.NumberFormat(locale).format(count);
  return translateWith(dicts, locale, pluralKey(dicts, locale, base, count), { n, ...params });
}

export function labelize(s: string): string {
  const t = s.replace(/[_.-]+/g, " ").trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : t;
}

/** Enum value -> localised label, falling back to a humanised raw value when unknown. */
export function enumWith(dicts: Dicts, locale: Locale, group: string, value: string): string {
  const k = `enum.${group}.${value}`;
  const tpl = dicts[locale]?.[k] ?? dicts[DEFAULT_LOCALE]?.[k];
  return tpl !== undefined ? tpl : labelize(value);
}
