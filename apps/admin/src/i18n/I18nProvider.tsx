import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LOCALE_NAMES, LOCALES, type Locale } from "@unsaid/shared";
import { dirOf, detectLocale, enumWith, pluralWith, setCurrentLocale, storeLocale, translateWith, type Dicts, type Key, type Params, type PluralBase } from "./core";
import { en } from "./en";
import { he } from "./he";
import * as f from "./format";

export const DICTS: Dicts = { en, he };

export interface I18n {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (l: Locale) => void;
  t: (key: Key, params?: Params) => string;
  /** plural: picks `<base>_one|_two|_other`; `{n}` is the formatted count. */
  tn: (base: PluralBase, count: number, params?: Params) => string;
  /** enum value -> label, with a safe fallback to the humanised raw value. */
  te: (group: "role" | "status" | "kind" | "category" | "audit" | "resolution" | "target", value: string) => string;
  fmt: {
    number: (n: number) => string;
    percent: (r: number) => string;
    date: (iso: string | null | undefined) => string;
    dateTime: (iso: string | null | undefined) => string;
    shortDay: (d: string) => string;
    relative: (iso: string | null | undefined) => string;
    uptime: (s: number) => string;
  };
  locales: readonly Locale[];
  localeNames: Record<Locale, string>;
}

const Ctx = createContext<I18n | null>(null);

function applyDocument(locale: Locale) {
  setCurrentLocale(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = dirOf(locale);
}
// Set before the first render so the API client and CSS see the right language immediately.
if (typeof document !== "undefined") applyDocument(detectLocale());

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());
  useEffect(() => { applyDocument(locale); }, [locale]);
  const setLocale = useCallback((l: Locale) => { storeLocale(l); applyDocument(l); setLocaleState(l); }, []);

  const value = useMemo<I18n>(() => ({
    locale,
    dir: dirOf(locale),
    setLocale,
    t: (key, params) => translateWith(DICTS, locale, key, params),
    tn: (base, count, params) => pluralWith(DICTS, locale, base, count, params),
    te: (group, value) => enumWith(DICTS, locale, group, value),
    fmt: {
      number: (n) => f.formatNumber(n, locale),
      percent: (r) => f.formatPercent(r, locale),
      date: (i) => f.formatDate(i, locale),
      dateTime: (i) => f.formatDateTime(i, locale),
      shortDay: (d) => f.shortDay(d, locale),
      relative: (i) => f.formatRelative(i, locale, Date.now(), translateWith(DICTS, locale, "common.never")),
      uptime: (s) => f.formatUptime(s, locale)
    },
    locales: LOCALES,
    localeNames: LOCALE_NAMES
  }), [locale, setLocale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): I18n {
  const c = useContext(Ctx);
  if (!c) throw new Error("useT outside I18nProvider");
  return c;
}
