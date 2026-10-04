import type { Translator } from "@/i18n/translate";

/** Pure presentation helpers (unit tested). */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, now - t);
  if (diff < MIN) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: diff > 300 * DAY ? "numeric" : undefined });
}

/** Localized variant of `timeAgo` (dictionary-driven; Hebrew gets proper plural forms). */
export function timeAgoT(iso: string, tr: Pick<Translator, "t" | "tp" | "locale">, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, now - t);
  if (diff < MIN) return tr.t("common.time.justNow");
  if (diff < HOUR) return tr.tp("common.time.minutesAgo", Math.floor(diff / MIN));
  if (diff < DAY) return tr.tp("common.time.hoursAgo", Math.floor(diff / HOUR));
  if (diff < 7 * DAY) return tr.tp("common.time.daysAgo", Math.floor(diff / DAY));
  return new Date(t).toLocaleDateString(tr.locale === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", year: diff > 300 * DAY ? "numeric" : undefined });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0] ?? "")[0] ?? "?";
  const second = parts.length > 1 ? Array.from(parts[parts.length - 1] ?? "")[0] ?? "" : "";
  return (first + second).toUpperCase();
}

export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Avatars may come back as absolute API URLs; the CSP only allows same-origin, so keep the /media path. */
export function mediaSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/media/") ? u.pathname + u.search : url;
  } catch {
    return null;
  }
}

/** Only allow same-site relative redirect targets. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Deterministic hue (0-360) for avatar fallbacks. */
export function hueFor(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 360;
}

export function shortUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /unsaid|okhttp|expo/i.test(ua) ? "Mobile app" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}
