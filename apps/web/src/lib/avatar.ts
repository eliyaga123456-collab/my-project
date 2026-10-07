/** Pure helpers for avatar editing and the owner's opt-in WhatsApp contact. */

/** Digits-only WhatsApp number (country code included) or null when it can't be valid (7-15 digits). */
export function normalizeWhatsapp(input: string): string | null {
  let d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  d = d.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  // Israeli mobile written locally (05X-XXXXXXX) -> 9725X...
  else if (/^05\d{8}$/.test(d)) d = "972" + d.slice(1);
  return /^\d{7,15}$/.test(d) ? d : null;
}

export const whatsappUrl = (digits: string) => `https://wa.me/${digits.replace(/\D/g, "")}`;

export interface CropState { zoom: number; x: number; y: number }
export const MAX_ZOOM = 4;

/** Scale at zoom 1: the image covers the circular viewport. */
export const baseScale = (w: number, h: number, view: number) => view / Math.min(w, h);

/** Keep the circle inside the image: offsets are the image centre relative to the viewport centre (px). */
export function clampCrop(c: CropState, w: number, h: number, view: number): CropState {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, c.zoom));
  const s = baseScale(w, h, view) * zoom;
  const mx = Math.max(0, (w * s - view) / 2);
  const my = Math.max(0, (h * s - view) / 2);
  return { zoom, x: Math.min(mx, Math.max(-mx, c.x)), y: Math.min(my, Math.max(-my, c.y)) };
}

/** Source square (image pixels) that is visible inside the circle. */
export function cropSource(c: CropState, w: number, h: number, view: number) {
  const k = clampCrop(c, w, h, view);
  const s = baseScale(w, h, view) * k.zoom;
  return { sx: (w * s / 2 - view / 2 - k.x) / s, sy: (h * s / 2 - view / 2 - k.y) / s, size: view / s };
}

/** Trim window for the animated-avatar video: at most `max` seconds and inside the clip. */
export function clampTrim(start: number, duration: number, total: number, max = 5) {
  const t = Math.max(0.1, total || 0);
  const d = Math.min(max, Math.max(0.5, duration), t);
  const s = Math.min(Math.max(0, start), Math.max(0, t - d));
  return { start: Math.round(s * 10) / 10, duration: Math.round(d * 10) / 10 };
}
