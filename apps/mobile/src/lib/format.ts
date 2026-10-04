/** Pure formatting helpers (no React Native imports so they are unit-testable). */

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]!;
  const second = parts.length > 1 ? parts[parts.length - 1]! : "";
  return (Array.from(first)[0]! + (second ? Array.from(second)[0]! : "")).toUpperCase();
}

export function countLabel(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function remainingChars(text: string, max: number): number {
  return max - Array.from(text).length;
}

export type DeviceKind = "unknown" | "android" | "ios" | "app" | "web" | "other";
/** Classifies a session user agent; the UI translates the kind (and shows `raw` for "other"). */
export function describeUserAgent(ua: string | null): { kind: DeviceKind; raw: string } {
  if (!ua) return { kind: "unknown", raw: "" };
  if (/okhttp|android/i.test(ua)) return { kind: "android", raw: ua };
  if (/iphone|ipad|ios|cfnetwork/i.test(ua)) return { kind: "ios", raw: ua };
  if (/expo/i.test(ua)) return { kind: "app", raw: ua };
  if (/chrome|firefox|safari|edge/i.test(ua)) return { kind: "web", raw: ua };
  return { kind: "other", raw: ua.slice(0, 40) };
}

export function publicLink(webUrl: string, username: string): string {
  return `${webUrl.replace(/\/+$/, "")}/u/${username}`;
}

/** Extracts the username or slug from deep link / universal link paths like /u/alice or /l/abcd1234. */
export function parseProfilePath(path: string): { kind: "u" | "l"; value: string } | null {
  const m = /^\/?(u|l)\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/.exec(path);
  return m ? { kind: m[1] as "u" | "l", value: m[2]! } : null;
}
