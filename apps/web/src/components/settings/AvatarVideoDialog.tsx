"use client";

import { useEffect, useRef, useState } from "react";
import { LIMITS, type ProfileDto } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { clampTrim } from "@/lib/avatar";
import { Button, Modal, useToast } from "@/components/ui";

/** Pick a video, choose start + length (max 5 s) with a live looping preview, upload as an animated avatar. */
export function AvatarVideoDialog({ file, onClose, onUploaded }: { file: File | null; onClose: () => void; onUploaded: (p: ProfileDto) => void }) {
  const { t } = useT();
  const toast = useToast();
  const video = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [start, setStart] = useState(0);
  const [len, setLen] = useState(5);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);

  useEffect(() => {
    setTotal(0); setStart(0); setLen(5); setBad(false); setBusy(false);
    if (!file) { setSrc(null); return; }
    const u = URL.createObjectURL(file);
    setSrc(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const trim = clampTrim(start, len, total);
  const setTrim = (s: number, l: number) => { const c = clampTrim(s, l, total); setStart(c.start); setLen(c.duration); if (video.current) video.current.currentTime = c.start; };

  // Loop the preview inside [start, start+len].
  useEffect(() => {
    const v = video.current; if (!v || !total) return;
    const onTime = () => { if (v.currentTime >= trim.start + trim.duration - 0.05 || v.currentTime < trim.start - 0.3) v.currentTime = trim.start; };
    v.addEventListener("timeupdate", onTime);
    v.currentTime = trim.start;
    void v.play().catch(() => undefined);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [trim.start, trim.duration, total]);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const profile = await api.request<ProfileDto>("POST", "/profile/avatar-video", undefined, { start: trim.start, duration: trim.duration }, { form });
      onUploaded(profile);
      toast.success(t("app.settings.profile.avatarUpdated"));
      onClose();
    } catch (err) { toast.error(errorMessage(err, t("public.errors.generic"))); setBusy(false); }
  }

  const num = "h-11 w-24 rounded-md border border-line bg-raised/60 px-3 text-center";
  return (
    <Modal open={!!file} onClose={onClose} title={t("app.settings.video.title")} description={t("app.settings.video.hint")}
      footer={<><Button variant="ghost" onClick={onClose}>{t("common.state.cancel")}</Button><Button onClick={upload} loading={busy} disabled={!total || bad}>{t("app.settings.video.use")}</Button></>}>
      {file && file.size > LIMITS.videoMaxBytes ? <p role="alert" className="text-danger">{t("app.settings.video.tooBig", { mb: Math.round(LIMITS.videoMaxBytes / 1048576) })}</p> : (
        <div className="space-y-4">
          <div className="mx-auto w-fit rounded-full p-1.5" style={{ background: "var(--grad-brand)" }}>
            {src && <video ref={video} src={src} muted playsInline loop={false} aria-label={t("app.settings.video.preview")} className="block size-56 rounded-full bg-black object-cover"
              onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (!isFinite(d) || d <= 0) { setBad(true); return; } setTotal(d); setLen(Math.min(5, d)); }} onError={() => setBad(true)} />}
          </div>
          {bad ? <p role="alert" className="text-center text-danger">{t("app.settings.video.bad")}</p> : (
            <>
              <div>
                <label htmlFor="vstart" className="mb-1 flex items-center justify-between gap-3 text-sm font-medium">{t("app.settings.video.start")}
                  <input type="number" dir="ltr" aria-label={t("app.settings.video.start")} className={num} min={0} max={Math.max(0, total - trim.duration)} step={0.1} value={trim.start} onChange={(e) => setTrim(Number(e.target.value) || 0, len)} /></label>
                <input id="vstart" type="range" className="h-2 w-full accent-[var(--secondary)]" min={0} max={Math.max(0, total - trim.duration)} step={0.1} value={trim.start} onChange={(e) => setTrim(Number(e.target.value), len)} />
              </div>
              <div>
                <label htmlFor="vlen" className="mb-1 flex items-center justify-between gap-3 text-sm font-medium">{t("app.settings.video.length")}
                  <input type="number" dir="ltr" aria-label={t("app.settings.video.length")} className={num} min={0.5} max={Math.min(5, total)} step={0.1} value={trim.duration} onChange={(e) => setTrim(start, Number(e.target.value) || 1)} /></label>
                <input id="vlen" type="range" className="h-2 w-full accent-[var(--secondary)]" min={0.5} max={Math.min(5, Math.max(0.5, total))} step={0.1} value={trim.duration} onChange={(e) => setTrim(start, Number(e.target.value))} />
                <p className="mt-1 text-xs text-muted">{t("app.settings.video.max")}</p>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
