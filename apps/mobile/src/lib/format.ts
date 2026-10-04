/** Pure formatting helpers (no React Native imports so they are unit-testable). */

export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const date = new Date(t);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]!;
  const second = parts.length > 1 ? parts[parts.length - 1]! : "";
  return (Array.from(first)[0]! + (second ? Array.from(second)[0]! : "")).toUpperCase();
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function countLabel(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function remainingChars(text: string, max: number): number {
  return max - Array.from(text).length;
}

export function describeUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/okhttp|android/i.test(ua)) return "Android device";
  if (/iphone|ipad|ios|cfnetwork/i.test(ua)) return "iOS device";
  if (/expo/i.test(ua)) return "Unsaid app";
  if (/chrome|firefox|safari|edge/i.test(ua)) return "Web browser";
  return ua.slice(0, 40);
}

export function publicLink(webUrl: string, username: string): string {
  return `${webUrl.replace(/\/+$/, "")}/u/${username}`;
}

/** Extracts the username or slug from deep link / universal link paths like /u/alice or /l/abcd1234. */
export function parseProfilePath(path: string): { kind: "u" | "l"; value: string } | null {
  const m = /^\/?(u|l)\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/.exec(path);
  return m ? { kind: m[1] as "u" | "l", value: m[2]! } : null;
}
