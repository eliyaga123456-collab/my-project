export const AVATAR_VIDEO_MAX_SECONDS = 5;

/** Clamps a trim request to what the server accepts: start >= 0, 0.5s <= duration <= 5s and inside the clip. */
export function clampTrim(start: number, duration: number, total: number | null): { start: number; duration: number } {
  const maxStart = total && total > 0 ? Math.max(0, total - 0.5) : Number.POSITIVE_INFINITY;
  const s = Math.min(Math.max(0, start), maxStart);
  const room = total && total > 0 ? Math.max(0.5, total - s) : AVATAR_VIDEO_MAX_SECONDS;
  const d = Math.min(Math.max(0.5, duration), AVATAR_VIDEO_MAX_SECONDS, room);
  return { start: Math.round(s * 10) / 10, duration: Math.round(d * 10) / 10 };
}
