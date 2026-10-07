"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Ban, Film, ImagePlus, MessageCircle, Trash2, Undo2 } from "lucide-react";
import { AVATAR_FRAMES, LIMITS, type ProfileDto } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { Avatar, Button, InputField, TextareaField, useToast } from "@/components/ui";
import { AvatarFrame } from "@/components/ui/AvatarFrame";
import { useMe } from "@/components/app/MeProvider";
import { SettingsCard } from "./parts";
import { AvatarCropper } from "./AvatarCropper";
import { AvatarVideoDialog } from "./AvatarVideoDialog";
import { normalizeWhatsapp } from "@/lib/avatar";

type Pending =
  | { kind: "image"; file: File; url: string }
  | { kind: "video"; file: File; url: string; start: number; duration: number }
  | { kind: "remove" };

const TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function ProfileSection() {
  const { t } = useT();
  const { me, setMe } = useMe();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(me.profile.displayName);
  const [bio, setBio] = useState(me.profile.bio);
  const [prompt, setPrompt] = useState(me.profile.prompt);
  const [frame, setFrame] = useState<string | null>(me.profile.avatarFrame);
  const [whatsapp, setWhatsapp] = useState(me.profile.whatsapp ?? "");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [pending, setPendingState] = useState<Pending | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<Pending | null>(null);
  const setPending = (p: Pending | null) => {
    const old = pendingRef.current;
    if (old && old.kind !== "remove") URL.revokeObjectURL(old.url);
    pendingRef.current = p; setPendingState(p);
  };
  useEffect(() => () => { const o = pendingRef.current; if (o && o.kind !== "remove") URL.revokeObjectURL(o.url); }, []);
  const dirty = !!pending || displayName !== me.profile.displayName || bio !== me.profile.bio || prompt !== me.profile.prompt || frame !== me.profile.avatarFrame || whatsapp.trim() !== (me.profile.whatsapp ?? "");
  const previewSrc = pending ? (pending.kind === "image" ? pending.url : null) : me.profile.avatarUrl;
  const hasPhoto = pending ? pending.kind !== "remove" : !!me.profile.avatarUrl;

  async function save(e: FormEvent) {
    e.preventDefault();
    const n: Record<string, string> = {};
    if (!displayName.trim()) n.displayName = t("app.settings.profile.nameEmpty");
    const wa = whatsapp.trim() ? normalizeWhatsapp(whatsapp) : null;
    if (whatsapp.trim() && !wa) n.whatsapp = t("app.settings.profile.whatsappBad");
    setErrors(n);
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      let next: ProfileDto | null = null;
      const p = pendingRef.current;
      if (p?.kind === "image") { const form = new FormData(); form.append("file", p.file); next = await api.profile.uploadAvatar(form); }
      else if (p?.kind === "video") { const form = new FormData(); form.append("file", p.file); next = await api.request<ProfileDto>("POST", "/profile/avatar-video", undefined, { start: p.start, duration: p.duration }, { form }); }
      else if (p?.kind === "remove") next = await api.profile.removeAvatar();
      if (next) { setMe({ ...me, profile: next }); setPending(null); }
      const profile = await api.profile.update({ displayName: displayName.trim(), bio: bio.trim(), prompt: prompt.trim(), avatarFrame: frame as never, whatsapp: wa });
      setMe({ ...me, profile });
      setWhatsapp(profile.whatsapp ?? "");
      toast.success(t("app.settings.profile.saved"));
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err, t("public.errors.generic"))); } finally { setBusy(false); }
  }

  function pick(f: File | undefined) {
    if (file.current) file.current.value = "";
    if (!f) return;
    if (!TYPES.includes(f.type)) { toast.error(t("app.settings.profile.badType")); return; }
    if (f.size > LIMITS.avatarMaxBytes) { toast.error(t("app.settings.profile.tooBig")); return; }
    if (f.type === "image/gif") setPending({ kind: "image", file: f, url: URL.createObjectURL(f) }); // animated GIFs are kept as-is (no crop)
    else setCropFile(f); // still photos open the circular cropper straight away
  }

  return (
    <SettingsCard id="s-profile" title={t("app.settings.profile.title")} description={t("app.settings.profile.body")}>
      <input ref={file} aria-label={t("app.settings.profile.uploadAria")} tabIndex={-1} type="file" accept={TYPES.join(",")} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={videoInput} aria-label={t("app.settings.video.aria")} tabIndex={-1} type="file" accept="video/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (videoInput.current) videoInput.current.value = ""; if (f) setVideoFile(f); }} />
      <fieldset className="mb-6 rounded-lg border border-line bg-raised/30 p-4">
        <legend className="px-2 text-sm font-semibold">{t("app.settings.avatar.title")}</legend>
        <div className="flex flex-col items-center gap-4">
          <div className="grid min-h-48 place-items-center" aria-live="polite">
            <AvatarFrame frame={frame} size={152} animate>
              {pending?.kind === "video" ? (
                <span className="relative inline-flex size-[152px] overflow-hidden rounded-full ring-2 ring-line">
                  <video src={pending.url} muted playsInline autoPlay loop aria-label={t("app.settings.video.preview")} className="size-full object-cover" />
                </span>
              ) : (
                <Avatar name={displayName || me.profile.displayName} src={hasPhoto ? previewSrc : null} size={152} />
              )}
            </AvatarFrame>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => file.current?.click()} leading={<ImagePlus className="size-4" aria-hidden />}>{t("app.settings.avatar.photo")}</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => file.current?.click()} leading={<Film className="size-4" aria-hidden />}>{t("app.settings.avatar.gif")}</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => videoInput.current?.click()} leading={<Film className="size-4" aria-hidden />}>{t("app.settings.video.choose")}</Button>
            {hasPhoto && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPending({ kind: "remove" })} leading={<Trash2 className="size-4" aria-hidden />}>{t("app.settings.profile.remove")}</Button>}
            {pending && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPending(null)} leading={<Undo2 className="size-4" aria-hidden />}>{t("app.settings.avatar.undo")}</Button>}
          </div>
          <p className="text-center text-xs text-muted">{t("app.settings.profile.avatarHint")}</p>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">{t("app.settings.frames.title")}</p>
          <div role="radiogroup" aria-label={t("app.settings.frames.title")} className="frame-strip -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 pt-1">
            {[null, ...AVATAR_FRAMES].map((f) => {
              const on = frame === f;
              return (
                <button key={f ?? "none"} type="button" role="radio" aria-checked={on} onClick={() => setFrame(f)}
                  className={"flex w-[4.75rem] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-xs font-semibold transition " + (on ? "border-secondary bg-raised shadow-[0_0_0_2px_color-mix(in_srgb,var(--secondary)_45%,transparent)]" : "border-line text-muted hover:bg-raised")}>
                  {f ? <Avatar name={displayName || me.profile.displayName} src={hasPhoto ? previewSrc : null} size={40} frame={f} /> : <span className="grid size-[52px] place-items-center"><span className="grid size-10 place-items-center rounded-full border border-dashed border-line text-muted"><Ban className="size-4" aria-hidden /></span></span>}
                  <span>{t(`app.settings.frames.${f ?? "none"}` as never)}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">{t("app.settings.frames.hint")}</p>
        </div>
      </fieldset>
      <AvatarCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(blob, type) => { setCropFile(null); setPending({ kind: "image", file: new File([blob], type === "image/png" ? "avatar.png" : "avatar.webp", { type }), url: URL.createObjectURL(blob) }); }} />
      <AvatarVideoDialog file={videoFile} onClose={() => setVideoFile(null)} onPicked={(f, start, duration) => { setVideoFile(null); setPending({ kind: "video", file: f, url: URL.createObjectURL(f), start, duration }); }} />
      <form onSubmit={save} noValidate className="space-y-4">
        <InputField label={t("app.settings.profile.displayName")} dir="auto" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={LIMITS.displayNameMax} error={errors.displayName} />
        <TextareaField label={t("app.settings.profile.bio")} dir="auto" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={LIMITS.bioMax} rows={3} counter={`${bio.length}/${LIMITS.bioMax}`} error={errors.bio} />
        <InputField label={t("app.settings.profile.prompt")} hint={t("app.settings.profile.promptHint")} dir="auto" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={LIMITS.promptMax} error={errors.prompt} />
        <InputField label={t("app.settings.profile.whatsapp")} hint={<span className="flex items-start gap-1.5"><MessageCircle className="mt-0.5 size-3.5 shrink-0 text-[#25d366]" aria-hidden />{t("app.settings.profile.whatsappHint")}</span>} dir="ltr" inputMode="tel" autoComplete="off" placeholder="+972 50 123 4567" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={24} error={errors.whatsapp} className="[&_input]:text-start" />
        <Button type="submit" loading={busy} disabled={!dirty}>{t("app.settings.profile.save")}</Button>
      </form>
    </SettingsCard>
  );
}
