"use client";

import { useRef, useState, type FormEvent } from "react";
import { Trash2, Upload } from "lucide-react";
import { LIMITS } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { Avatar, Button, InputField, TextareaField, useToast } from "@/components/ui";
import { useMe } from "@/components/app/MeProvider";
import { SettingsCard } from "./parts";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProfileSection() {
  const { t } = useT();
  const { me, setMe } = useMe();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(me.profile.displayName);
  const [bio, setBio] = useState(me.profile.bio);
  const [prompt, setPrompt] = useState(me.profile.prompt);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const dirty = displayName !== me.profile.displayName || bio !== me.profile.bio || prompt !== me.profile.prompt;

  async function save(e: FormEvent) {
    e.preventDefault();
    const n: Record<string, string> = {};
    if (!displayName.trim()) n.displayName = t("app.settings.profile.nameEmpty");
    setErrors(n);
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      const profile = await api.profile.update({ displayName: displayName.trim(), bio: bio.trim(), prompt: prompt.trim() });
      setMe({ ...me, profile });
      toast.success(t("app.settings.profile.saved"));
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err, t("public.errors.generic"))); } finally { setBusy(false); }
  }

  async function upload(f: File | undefined) {
    if (!f) return;
    if (!TYPES.includes(f.type)) { toast.error(t("app.settings.profile.badType")); return; }
    if (f.size > LIMITS.avatarMaxBytes) { toast.error(t("app.settings.profile.tooBig")); return; }
    setAvatarBusy(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const profile = await api.profile.uploadAvatar(form);
      setMe({ ...me, profile });
      toast.success(t("app.settings.profile.avatarUpdated"));
    } catch (err) { toast.error(errorMessage(err, t("public.errors.generic"))); } finally { setAvatarBusy(false); if (file.current) file.current.value = ""; }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    try { const profile = await api.profile.removeAvatar(); setMe({ ...me, profile }); toast.success(t("app.settings.profile.avatarRemoved")); } catch (err) { toast.error(errorMessage(err, t("public.errors.generic"))); } finally { setAvatarBusy(false); }
  }

  return (
    <SettingsCard id="s-profile" title={t("app.settings.profile.title")} description={t("app.settings.profile.body")}>
      <div className="mb-5 flex items-center gap-4">
        <Avatar name={me.profile.displayName} src={me.profile.avatarUrl} size={72} />
        <div className="flex flex-wrap gap-2">
          <input ref={file} id="avatar-file" aria-label={t("app.settings.profile.uploadAria")} tabIndex={-1} type="file" accept={TYPES.join(",")} className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          <Button size="sm" variant="secondary" loading={avatarBusy} onClick={() => file.current?.click()} leading={<Upload className="size-4" aria-hidden />}>{t("app.settings.profile.upload")}</Button>
          {me.profile.avatarUrl && <Button size="sm" variant="ghost" disabled={avatarBusy} onClick={removeAvatar} leading={<Trash2 className="size-4" aria-hidden />}>{t("app.settings.profile.remove")}</Button>}
          <p className="w-full text-xs text-muted">{t("app.settings.profile.avatarHint")}</p>
        </div>
      </div>
      <form onSubmit={save} noValidate className="space-y-4">
        <InputField label={t("app.settings.profile.displayName")} dir="auto" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={LIMITS.displayNameMax} error={errors.displayName} />
        <TextareaField label={t("app.settings.profile.bio")} dir="auto" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={LIMITS.bioMax} rows={3} counter={`${bio.length}/${LIMITS.bioMax}`} error={errors.bio} />
        <InputField label={t("app.settings.profile.prompt")} hint={t("app.settings.profile.promptHint")} dir="auto" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={LIMITS.promptMax} error={errors.prompt} />
        <Button type="submit" loading={busy} disabled={!dirty}>{t("app.settings.profile.save")}</Button>
      </form>
    </SettingsCard>
  );
}
