"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Move } from "lucide-react";
import { useT } from "@/i18n/client";
import { Button, Modal } from "@/components/ui";
import { MAX_ZOOM, baseScale, clampCrop, cropSource, type CropState } from "@/lib/avatar";

const VIEW = 260; // CSS px of the square viewport
const OUT = 512; // exported square size

/** Free circular crop: drag to pan, slider / wheel / pinch-less buttons to zoom. Exports a square image (the app masks it round). */
export function AvatarCropper({ file, onCancel, onDone }: { file: File | null; onCancel: () => void; onDone: (blob: Blob, type: string) => void }) {
  const { t } = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [crop, setCrop] = useState<CropState>({ zoom: 1, x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReady(false); setFailed(false); setCrop({ zoom: 1, x: 0, y: 0 });
    if (!file) return;
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => { img.current = el; setReady(true); };
    el.onerror = () => setFailed(true);
    el.src = url;
    return () => { URL.revokeObjectURL(url); img.current = null; };
  }, [file]);

  const draw = useCallback(() => {
    const c = canvas.current; const im = img.current;
    if (!c || !im) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = VIEW * dpr; c.height = VIEW * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const { sx, sy, size } = cropSource(crop, im.naturalWidth, im.naturalHeight, VIEW);
    ctx.drawImage(im, sx, sy, size, size, 0, 0, VIEW, VIEW);
    ctx.fillStyle = "rgba(8,4,15,.62)";
    ctx.beginPath(); ctx.rect(0, 0, VIEW, VIEW); ctx.arc(VIEW / 2, VIEW / 2, VIEW / 2 - 2, 0, Math.PI * 2, true); ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(VIEW / 2, VIEW / 2, VIEW / 2 - 2, 0, Math.PI * 2); ctx.stroke();
  }, [crop]);
  useEffect(() => { if (ready) draw(); }, [ready, draw]);

  const update = (next: Partial<CropState>) => {
    const im = img.current; if (!im) return;
    setCrop((c) => clampCrop({ ...c, ...next }, im.naturalWidth, im.naturalHeight, VIEW));
  };
  const zoomBy = (d: number) => update({ zoom: crop.zoom + d });

  async function save() {
    const im = img.current; if (!im) return;
    setBusy(true);
    const out = document.createElement("canvas");
    out.width = OUT; out.height = OUT;
    const ctx = out.getContext("2d");
    if (!ctx) { setBusy(false); return; }
    const { sx, sy, size } = cropSource(crop, im.naturalWidth, im.naturalHeight, VIEW);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(im, sx, sy, size, size, 0, 0, OUT, OUT);
    const toBlob = (type: string) => new Promise<Blob | null>((r) => out.toBlob(r, type, 0.92));
    let blob = await toBlob("image/webp");
    if (!blob || blob.type !== "image/webp") blob = await toBlob("image/png");
    setBusy(false);
    if (blob) onDone(blob, blob.type);
  }

  return (
    <Modal open={!!file} onClose={onCancel} title={t("app.settings.crop.title")} description={t("app.settings.crop.hint")}
      footer={<><Button variant="ghost" onClick={onCancel}>{t("common.state.cancel")}</Button><Button onClick={save} loading={busy} disabled={!ready}>{t("app.settings.crop.apply")}</Button></>}>
      {failed ? <p role="alert" className="text-danger">{t("app.settings.profile.badType")}</p> : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative rounded-full p-1.5" style={{ background: "var(--grad-brand)" }}>
            <canvas
              ref={canvas} tabIndex={0} role="img" aria-label={t("app.settings.crop.aria")}
              style={{ width: VIEW, height: VIEW, touchAction: "none", cursor: "grab", maxWidth: "100%" }}
              className="block rounded-full bg-raised focus-visible:outline-offset-4"
              onPointerDown={(e) => { drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerMove={(e) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; update({ x: crop.x + e.clientX - d.x, y: crop.y + e.clientY - d.y }); drag.current = { id: d.id, x: e.clientX, y: e.clientY }; }}
              onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
              onWheel={(e) => zoomBy(-e.deltaY * 0.002)}
              onKeyDown={(e) => {
                const step = 12;
                const m: Record<string, () => void> = { ArrowLeft: () => update({ x: crop.x + step }), ArrowRight: () => update({ x: crop.x - step }), ArrowUp: () => update({ y: crop.y + step }), ArrowDown: () => update({ y: crop.y - step }), "+": () => zoomBy(0.15), "=": () => zoomBy(0.15), "-": () => zoomBy(-0.15) };
                const f = m[e.key]; if (f) { e.preventDefault(); f(); }
              }}
            />
            {!ready && <span className="absolute inset-0 grid place-items-center rounded-full"><span className="skeleton size-full rounded-full" /></span>}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted"><Move className="size-3.5" aria-hidden />{t("app.settings.crop.drag")}</p>
          <div className="flex w-full max-w-xs items-center gap-3">
            <button type="button" onClick={() => zoomBy(-0.25)} aria-label={t("app.settings.crop.zoomOut")} className="grid size-10 shrink-0 place-items-center rounded-full border border-line hover:bg-raised"><Minus className="size-4" aria-hidden /></button>
            <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={crop.zoom} onChange={(e) => update({ zoom: Number(e.target.value) })} aria-label={t("app.settings.crop.zoom")} className="h-2 w-full accent-[var(--secondary)]" />
            <button type="button" onClick={() => zoomBy(0.25)} aria-label={t("app.settings.crop.zoomIn")} className="grid size-10 shrink-0 place-items-center rounded-full border border-line hover:bg-raised"><Plus className="size-4" aria-hidden /></button>
          </div>
        </div>
      )}
    </Modal>
  );
}
