"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Move, RotateCcw } from "lucide-react";
import { useT } from "@/i18n/client";
import { Button, Modal } from "@/components/ui";
import { MAX_ZOOM, clampCrop, cropSource, pinchZoom, pointerDistance, type CropState } from "@/lib/avatar";

const VIEW = 260; // CSS px of the square viewport
const OUT = 512; // exported square size
const RESET: CropState = { zoom: 1, x: 0, y: 0 };

interface Loaded { src: CanvasImageSource; w: number; h: number; close?: () => void }

/** Decode honouring EXIF orientation (createImageBitmap, falling back to <img>, which also applies EXIF). */
async function decode(file: File): Promise<Loaded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const el = new Image();
    el.src = url;
    await el.decode();
    return { src: el, w: el.naturalWidth, h: el.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}

/** Circular crop: drag to pan, pinch / wheel / slider / buttons to zoom. Exports a crisp 512px square (the app masks it round). */
export function AvatarCropper({ file, onCancel, onDone }: { file: File | null; onCancel: () => void; onDone: (blob: Blob, type: string) => void }) {
  const { t } = useT();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const img = useRef<Loaded | null>(null);
  const cropRef = useRef<CropState>(RESET);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const [crop, setCropState] = useState<CropState>(RESET);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const setCrop = useCallback((c: CropState) => { cropRef.current = c; setCropState(c); }, []);

  useEffect(() => {
    setReady(false); setFailed(false); setCrop(RESET);
    pointers.current.clear(); pinch.current = null;
    if (!file) return;
    let dead = false;
    decode(file).then((l) => {
      if (dead) { l.close?.(); return; }
      if (!l.w || !l.h) { setFailed(true); return; }
      img.current = l; setReady(true);
    }).catch(() => { if (!dead) setFailed(true); });
    return () => { dead = true; img.current?.close?.(); img.current = null; };
  }, [file, setCrop]);

  const draw = useCallback(() => {
    const c = canvas.current; const im = img.current;
    if (!c || !im) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.round(VIEW * dpr); c.height = Math.round(VIEW * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingQuality = "high";
    const { sx, sy, size } = cropSource(crop, im.w, im.h, VIEW);
    ctx.drawImage(im.src, sx, sy, size, size, 0, 0, VIEW, VIEW);
    ctx.fillStyle = "rgba(8,4,15,.62)";
    ctx.beginPath(); ctx.rect(0, 0, VIEW, VIEW); ctx.arc(VIEW / 2, VIEW / 2, VIEW / 2 - 2, 0, Math.PI * 2, true); ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(VIEW / 2, VIEW / 2, VIEW / 2 - 2, 0, Math.PI * 2); ctx.stroke();
  }, [crop]);
  useEffect(() => { if (ready) draw(); }, [ready, draw]);

  const update = useCallback((next: Partial<CropState>) => {
    const im = img.current; if (!im) return;
    setCrop(clampCrop({ ...cropRef.current, ...next }, im.w, im.h, VIEW));
  }, [setCrop]);
  const zoomBy = useCallback((d: number) => update({ zoom: cropRef.current.zoom + d }), [update]);

  // Wheel needs a non-passive listener to stop the page/modal from scrolling.
  useEffect(() => {
    const c = canvas.current; if (!c || !ready) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomBy(-e.deltaY * 0.002); };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  }, [ready, zoomBy]);

  const pair = () => { const [a, b] = [...pointers.current.values()]; return a && b ? [a, b] as const : null; };

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const p = pair();
    pinch.current = p ? { dist: pointerDistance(p[0], p[1]), zoom: cropRef.current.zoom } : null;
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = pair();
    if (p && pinch.current) { update({ zoom: pinchZoom(pinch.current.zoom, pinch.current.dist, pointerDistance(p[0], p[1])) }); return; }
    if (pointers.current.size !== 1) return;
    const k = VIEW / (e.currentTarget.getBoundingClientRect().width || VIEW); // canvas may be shrunk by CSS on tiny screens
    update({ x: cropRef.current.x + (e.clientX - prev.x) * k, y: cropRef.current.y + (e.clientY - prev.y) * k });
  }
  function up(e: React.PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    // When one finger lifts during a pinch, the remaining one continues as a pan from its current position.
  }

  async function save() {
    const im = img.current; if (!im) return;
    setBusy(true);
    try {
      const out = document.createElement("canvas");
      out.width = OUT; out.height = OUT;
      const ctx = out.getContext("2d");
      if (!ctx) return;
      const { sx, sy, size } = cropSource(cropRef.current, im.w, im.h, VIEW);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(im.src, sx, sy, size, size, 0, 0, OUT, OUT);
      const toBlob = (type: string) => new Promise<Blob | null>((r) => out.toBlob(r, type, 0.92));
      let blob = await toBlob("image/webp");
      if (!blob || blob.type !== "image/webp") blob = await toBlob("image/png");
      if (blob) onDone(blob, blob.type);
    } finally { setBusy(false); }
  }

  const stepBtn = "grid size-12 shrink-0 place-items-center rounded-full border border-line hover:bg-raised active:scale-95";
  return (
    <Modal open={!!file} onClose={onCancel} title={t("app.settings.crop.title")} description={t("app.settings.crop.hint")}
      footer={<><Button size="lg" variant="ghost" onClick={onCancel}>{t("common.state.cancel")}</Button><Button size="lg" onClick={save} loading={busy} disabled={!ready}>{t("app.settings.crop.apply")}</Button></>}>
      {failed ? <p role="alert" className="text-danger">{t("app.settings.profile.badType")}</p> : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative max-w-full rounded-full p-1.5" style={{ background: "var(--grad-brand)" }}>
            <canvas
              ref={canvas} tabIndex={0} role="img" aria-label={t("app.settings.crop.aria")}
              style={{ width: VIEW, height: VIEW, touchAction: "none", cursor: "grab", maxWidth: "100%" }}
              className="block select-none rounded-full bg-raised focus-visible:outline-offset-4"
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}
              onKeyDown={(e) => {
                const step = 12; const c = cropRef.current;
                const m: Record<string, () => void> = { ArrowLeft: () => update({ x: c.x + step }), ArrowRight: () => update({ x: c.x - step }), ArrowUp: () => update({ y: c.y + step }), ArrowDown: () => update({ y: c.y - step }), "+": () => zoomBy(0.15), "=": () => zoomBy(0.15), "-": () => zoomBy(-0.15) };
                const f = m[e.key]; if (f) { e.preventDefault(); f(); }
              }}
            />
            {!ready && <span className="absolute inset-0 grid place-items-center rounded-full"><span className="skeleton size-full rounded-full" /></span>}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted"><Move className="size-3.5" aria-hidden />{t("app.settings.crop.drag")}</p>
          <div className="flex w-full max-w-xs items-center gap-3">
            <button type="button" onClick={() => zoomBy(-0.25)} aria-label={t("app.settings.crop.zoomOut")} className={stepBtn}><Minus className="size-5" aria-hidden /></button>
            <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={crop.zoom} onChange={(e) => update({ zoom: Number(e.target.value) })} aria-label={t("app.settings.crop.zoom")} className="h-8 w-full accent-[var(--secondary)]" />
            <button type="button" onClick={() => zoomBy(0.25)} aria-label={t("app.settings.crop.zoomIn")} className={stepBtn}><Plus className="size-5" aria-hidden /></button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCrop(RESET)} leading={<RotateCcw className="size-4" aria-hidden />}>{t("app.settings.crop.reset")}</Button>
        </div>
      )}
    </Modal>
  );
}
