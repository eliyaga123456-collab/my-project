"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { LIMITS, usernameSchema } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { isolateIn } from "@/i18n/format";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { Button, ConfirmDialog, InputField, useToast } from "@/components/ui";
import { useMe } from "@/components/app/MeProvider";
import { SettingsCard } from "./parts";

export function UsernameSection() {
  const { t, locale } = useT();
  const { me, setMe } = useMe();
  const toast = useToast();
  const [value, setValue] = useState(me.profile.username);
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken" | "unknown">("idle");
  const [formatError, setFormatError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = value.toLowerCase() !== me.profile.username;

  useEffect(() => {
    setError(null);
    if (!changed) { setStatus("idle"); setFormatError(null); return; }
    const p = usernameSchema.safeParse(value);
    if (!p.success) { setFormatError(t("app.settings.username.invalid", { min: LIMITS.usernameMin, max: LIMITS.usernameMax })); setStatus("idle"); return; }
    setFormatError(null);
    setStatus("checking");
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try { const r = await api.auth.usernameAvailable(p.data); if (!cancelled) setStatus(r.available ? "ok" : "taken"); } catch { if (!cancelled) setStatus("unknown"); }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [value, changed, t]);

  async function apply() {
    setBusy(true);
    try {
      const profile = await api.profile.changeUsername(usernameSchema.parse(value));
      setMe({ ...me, profile, user: { ...me.user, username: profile.username } });
      toast.success(t("app.settings.username.changed"));
      setConfirm(false);
    } catch (e) { setConfirm(false); setError(errorMessage(e, t("public.errors.generic"))); } finally { setBusy(false); }
  }

  const hint = status === "checking" ? t("app.settings.username.checking") : status === "ok" ? <span className="inline-flex items-center gap-1 text-success"><Check className="size-3.5" aria-hidden />{t("app.settings.username.available")}</span> : t("app.settings.username.yourLink", { name: isolateIn(locale, value.toLowerCase()) });
  const err = formatError ?? (status === "taken" ? t("app.settings.username.taken") : error);

  return (
    <SettingsCard id="s-username" title={t("app.settings.username.title")} description={t("app.settings.username.body")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <InputField className="flex-1" label={t("app.settings.username.label")} dir="auto" value={value} onChange={(e) => setValue(e.target.value.trim())} maxLength={LIMITS.usernameMax} autoCapitalize="none" spellCheck={false} error={err} hint={err ? undefined : hint} />
        <Button className="sm:mt-7" disabled={!changed || status !== "ok"} onClick={() => setConfirm(true)}>{t("app.settings.username.change")}</Button>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={apply} loading={busy} title={t("app.settings.username.confirmTitle")} confirmLabel={t("app.settings.username.confirmButton")} description={t("app.settings.username.confirmBody", { name: isolateIn(locale, value.toLowerCase()), old: isolateIn(locale, me.profile.username) })} />
    </SettingsCard>
  );
}
