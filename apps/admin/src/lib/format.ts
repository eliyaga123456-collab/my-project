import type { UserRole, UserStatus } from "@unsaid/shared";

export { labelize } from "../i18n/core";

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

