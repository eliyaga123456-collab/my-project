// Pure math for the circular avatar crop. Marked as worklets so the gesture handlers can call them on the UI thread.
export const MAX_ZOOM = 6;

/** Size of the image scaled so it just COVERS a crop x crop square (zoom 1). */
export function coverSize(w: number, h: number, crop: number): { iw: number; ih: number } {
  "worklet";
  const sw = w > 0 ? w : 1, sh = h > 0 ? h : 1;
  const base = Math.max(crop / sw, crop / sh);
  return { iw: sw * base, ih: sh * base };
}

export function clampScale(s: number, max: number = MAX_ZOOM): number {
  "worklet";
  return Math.min(max, Math.max(1, Number.isFinite(s) ? s : 1));
}

/** Largest allowed |translation| on each axis so the crop square stays fully covered. */
export function maxOffset(iw: number, ih: number, scale: number, crop: number): { mx: number; my: number } {
  "worklet";
  return { mx: Math.max(0, (iw * scale - crop) / 2), my: Math.max(0, (ih * scale - crop) / 2) };
}

export function clampOffset(tx: number, ty: number, iw: number, ih: number, scale: number, crop: number): { x: number; y: number } {
  "worklet";
  const { mx, my } = maxOffset(iw, ih, scale, crop);
  return { x: Math.min(mx, Math.max(-mx, tx)), y: Math.min(my, Math.max(-my, ty)) };
}

/** Slider fraction (0..1) <-> zoom (1..max). */
export const zoomToFraction = (s: number, max: number = MAX_ZOOM) => (clampScale(s, max) - 1) / (max - 1);
export const fractionToZoom = (f: number, max: number = MAX_ZOOM) => clampScale(1 + Math.min(1, Math.max(0, f)) * (max - 1), max);
