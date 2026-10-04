import { DEFAULT_LOCALE, LOCALES, RTL_LOCALES, type Locale } from "@unsaid/shared";

export { DEFAULT_LOCALE, LOCALES, type Locale };
export const LOCALE_COOKIE = "ear-locale";
export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);
export const dirOf = (l: Locale): "ltr" | "rtl" => (RTL_LOCALES.includes(l) ? "rtl" : "ltr");

/** Picks a locale from an Accept-Language header (he/iw → Hebrew). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  const first = (header ?? "").toLowerCase().split(",")[0]?.trim() ?? "";
  return first.startsWith("he") || first.startsWith("iw") ? "he" : DEFAULT_LOCALE;
}
