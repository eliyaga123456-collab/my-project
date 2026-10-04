import type { Locale } from "@unsaid/shared";

const nf = new Map<string, Intl.NumberFormat>();
function num(locale: Locale, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const k = locale + JSON.stringify(opts);
  let f = nf.get(k);
  if (!f) { f = new Intl.NumberFormat(locale, opts); nf.set(k, f); }
  return f;
}

export function formatNumber(n: number, locale: Locale = "en"): string {
  if (!Number.isFinite(n)) return "–";
  return num(locale, { maximumFractionDigits: 1, notation: Math.abs(n) >= 100_000 ? "compact" : "standard" }).format(n);
}

/** Rates arrive as fractions (0.034 => 3.4%). Values above 1 are assumed to already be percentages. */
export function formatPercent(rate: number, locale: Locale = "en"): string {
  if (!Number.isFinite(rate)) return "–";
  const frac = rate <= 1 ? rate : rate / 100;
  const pct = frac * 100;
  const digits = pct > 0 && pct < 10 ? 1 : 0;
  return num(locale, { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(frac);
}

export function formatUptime(seconds: number, locale: Locale = "en"): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "–";
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  const u = (value: number, unit: string) => num(locale, { style: "unit", unit, unitDisplay: "narrow" }).format(value);
  if (d > 0) return `${u(d, "day")} ${u(h, "hour")}`;
  if (h > 0) return `${u(h, "hour")} ${u(m, "minute")}`;
  if (m > 0) return `${u(m, "minute")} ${u(s % 60, "second")}`;
  return u(s, "second");
}

export function formatDate(iso: string | null | undefined, locale: Locale = "en"): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(d);
}

export function formatDateTime(iso: string | null | undefined, locale: Locale = "en"): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function shortDay(date: string, locale: Locale = "en"): string {
  const d = new Date(date.length === 10 ? `${date}T00:00:00` : date);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d);
}

/** "5 minutes ago" / "לפני 5 דקות"; older than 30 days falls back to a date. Missing -> `never`. */
export function formatRelative(iso: string | null | undefined, locale: Locale = "en", now: number = Date.now(), never = "–"): string {
  if (!iso) return never;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "–";
  const diff = Math.round((now - t) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  if (diff < 45) return rtf.format(0, "second");
  if (diff < 3600) return rtf.format(-Math.max(1, Math.round(diff / 60)), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400), "day");
  return formatDate(iso, locale);
}
