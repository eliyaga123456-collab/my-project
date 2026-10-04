import type { Locale } from "./config";

/** Wraps text in Unicode isolates so names, @handles, URLs and "EAR" keep their own direction inside RTL text. */
export const isolate = (s: string) => `⁨${s}⁩`;

export const formatNumber = (locale: Locale, n: number) => new Intl.NumberFormat(locale).format(n);
export const formatCompact = (locale: Locale, n: number) => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
export const formatDateTime = (locale: Locale, d: Date | string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) =>
  new Intl.DateTimeFormat(locale, opts).format(typeof d === "string" ? new Date(d) : d);
export const formatDate = (locale: Locale, d: Date | string) => formatDateTime(locale, d, { day: "numeric", month: "short", year: "numeric" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31_536_000], ["month", 2_592_000], ["day", 86_400], ["hour", 3600], ["minute", 60]];
export function formatRelative(locale: Locale, d: Date | string, now = Date.now()): string {
  const sec = Math.round((new Date(d).getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, s] of UNITS) if (Math.abs(sec) >= s) return rtf.format(Math.round(sec / s), unit);
  return rtf.format(0, "second");
}

/** Isolates user-supplied text (names, handles) only where it matters: inside RTL sentences. Keeps English strings clean. */
export const isolateIn = (locale: Locale, s: string) => (locale === "he" ? isolate(s) : s);
