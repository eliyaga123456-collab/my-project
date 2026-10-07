"use client";

import { useRef, useState, type FormEvent } from "react";
import { Ban, MessageCircle, Trash2, Upload, Video } from "lucide-react";
import { AVATAR_FRAMES, LIMITS } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { Avatar, Button, InputField, TextareaField, useToast } from "@/components/ui";
import { useMe } from "@/components/app/MeProvider";
import { SettingsCard } from "./parts";
import { AvatarCropper } from "./AvatarCropper";
import { AvatarVideoDialog } from "./AvatarVideoDialog";
import { normalizeWhatsapp } from "@/lib/avatar";

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
  const videoInput = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const dirty = displayName !== me.profile.displayName || bio !== me.profile.bio || prompt !== me.profile.prompt || frame !== me.profile.avatarFrame || whatsapp.trim() !== (me.profile.whatsapp ?? "");

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
    if (f.type === "image/gif") void upload(f); // animated GIFs are kept as-is (no crop)
    else setCropFile(f);
  }

  async function upload(f: File) {
    setAvatarBusy(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const profile = await api.profile.uploadAvatar(form);
      setMe({ ...me, profile });
      toast.success(t("app.settings.profile.avatarUpdated"));
    } catch (err) { toast.error(errorMessage(err, t("public.errors.generic"))); } finally { setAvatarBusy(false); }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    try { const profile = await api.profile.removeAvatar(); setMe({ ...me, profile }); toast.success(t("app.settings.profile.avatarRemoved")); } catch (err) { toast.error(errorMessage(err, t("public.errors.generic"))); } finally { setAvatarBusy(false); }
  }

  return (
    <SettingsCard id="s-profile" title={t("app.settings.profile.title")} description={t("app.settings.profile.body")}>
      <div className="mb-5 flex items-center gap-4">
        <span className="px-2 pt-2"><Avatar name={me.profile.displayName} src={me.profile.avatarUrl} size={72} frame={frame} /></span>
        <div className="flex flex-wrap gap-2">
          <input ref={file} id="avatar-file" aria-label={t("app.settings.profile.uploadAria")} tabIndex={-1} type="file" accept={TYPES.join(",")} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          <input ref={videoInput} aria-label={t("app.settings.video.aria")} tabIndex={-1} type="file" accept="video/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (videoInput.current) videoInput.current.value = ""; if (f) setVideoFile(f); }} />
          <Button size="sm" variant="secondary" loading={avatarBusy} onClick={() => file.current?.click()} leading={<Upload className="size-4" aria-hidden />}>{t("app.settings.profile.upload")}</Button>
          <Button size="sm" variant="secondary" disabled={avatarBusy} onClick={() => videoInput.current?.click()} leading={<Video className="size-4" aria-hidden />}>{t("app.settings.video.choose")}</Button>
          {me.profile.avatarUrl && <Button size="sm" variant="ghost" disabled={avatarBusy} onClick={removeAvatar} leading={<Trash2 className="size-4" aria-hidden />}>{t("app.settings.profile.remove")}</Button>}
          <p className="w-full text-xs text-muted">{t("app.settings.profile.avatarHint")}</p>
        </div>
      </div>
      <AvatarCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(blob, type) => { setCropFile(null); void upload(new File([blob], type === "image/png" ? "avatar.png" : "avatar.webp", { type })); }} />
      <AvatarVideoDialog file={videoFile} onClose={() => setVideoFile(null)} onUploaded={(profile) => setMe({ ...me, profile })} />
      <fieldset className="mb-6">
        <legend className="mb-1 text-sm font-semibold">{t("app.settings.frames.title")}</legend>
        <p className="mb-3 text-xs text-muted">{t("app.settings.frames.hint")}</p>
        <div role="radiogroup" aria-label={t("app.settings.frames.title")} className="grid grid-cols-3 gap-2 xs:grid-cols-4 sm:grid-cols-6">
          {[null, ...AVATAR_FRAMES].map((f) => {
            const on = frame === f;
            return (
              <button key={f ?? "none"} type="button" role="radio" aria-checked={on} onClick={() => setFrame(f)}
                className={"group flex min-h-[5.5rem] flex-col items-center justify-end gap-1.5 rounded-lg border px-1 pb-2 pt-4 text-xs font-semibold transition hover:-translate-y-0.5 " + (on ? "border-secondary bg-raised shadow-[0_0_0_2px_color-mix(in_srgb,var(--secondary)_45%,transparent)]" : "border-line text-muted hover:bg-raised")}>
                {f ? <Avatar name={me.profile.displayName} src={me.profile.avatarUrl} size={40} frame={f} /> : <span className="grid size-10 place-items-center rounded-full border border-dashed border-line text-muted"><Ban className="size-4" aria-hidden /></span>}
                <span>{t(`app.settings.frames.${f ?? "none"}` as never)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
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
