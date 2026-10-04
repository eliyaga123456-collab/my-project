import type { UserRole, UserStatus } from "@unsaid/shared";

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "–";
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1, notation: Math.abs(n) >= 100_000 ? "compact" : "standard" }).format(n);
}

/** Rates arrive as fractions (0.034 => 3.4%). Values above 1 are assumed to already be percentages. */
export function formatPercent(rate: number): string {
  if (!Number.isFinite(rate)) return "–";
  const pct = rate <= 1 ? rate * 100 : rate;
  return `${pct.toFixed(pct > 0 && pct < 10 ? 1 : 0)}%`;
}

export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "–";
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function formatRelative(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "never";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "–";
  const diff = Math.round((now - t) / 1000);
  if (diff < 0) return "just now";
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)}d ago`;
  return formatDate(iso);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

/** "self_harm" -> "Self harm" */
export function labelize(s: string): string {
  const t = s.replace(/[_.-]+/g, " ").trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : t;
}

export function shortId(id: string | null | undefined): string {
  if (!id) return "–";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function cleanNote(note: string): string | undefined {
  const t = note.trim();
  return t ? t.slice(0, 500) : undefined;
}

export function isStaff(role: UserRole | undefined): boolean {
  return role === "admin" || role === "moderator";
}

export type UserAction = "suspend" | "unsuspend" | "ban" | "unban";

/** Which moderation actions a staff role may perform on a user with the given status. */
export function allowedUserActions(role: UserRole | undefined, status: UserStatus): UserAction[] {
  if (!isStaff(role)) return [];
  const out: UserAction[] = [];
  if (status === "active") out.push("suspend");
  if (status === "suspended") out.push("unsuspend");
  if (role === "admin") {
    if (status !== "banned") out.push("ban");
    else out.push("unban");
  }
  return out;
}

export function canBan(role: UserRole | undefined): boolean {
  return role === "admin";
}

/** Chart helper: round a max up to a "nice" axis bound and produce evenly spaced ticks. */
export function niceScale(max: number, ticks = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) return { max: ticks, ticks: Array.from({ length: ticks + 1 }, (_, i) => i) };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const top = step * ticks;
  return { max: top, ticks: Array.from({ length: ticks + 1 }, (_, i) => i * step) };
}

export function shortDay(date: string): string {
  const d = new Date(date.length === 10 ? `${date}T00:00:00` : date);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(d);
}
