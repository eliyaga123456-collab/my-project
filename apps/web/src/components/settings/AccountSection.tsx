"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, LogOut, MailWarning } from "lucide-react";
import { LIMITS, emailSchema, passwordSchema } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import { errorMessage, fieldErrors, isApiError } from "@/lib/errors";
import { Badge, Button, InputField, useToast } from "@/components/ui";
import { useMe } from "@/components/app/MeProvider";
import { PasswordField } from "@/components/auth/PasswordField";
import { SettingsCard } from "./parts";

export function PasswordSection() {
  const { t } = useT();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n: Record<string, string> = {};
    if (!current) n.current = t("app.settings.password.enterCurrent");
    const p = passwordSchema.safeParse(next);
    if (!p.success) n.next = t("auth.password.tooShort", { min: LIMITS.passwordMin });
    setErrors(n);
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      await api.auth.changePassword({ currentPassword: current, newPassword: next });
      setCurrent(""); setNext("");
      toast.success(t("app.settings.password.changed"));
    } catch (err) {
      const fe = fieldErrors(err);
      if (isApiError(err) && (err.status === 401 || err.status === 403 || err.code === "forbidden")) setErrors({ current: t("app.settings.password.wrongCurrent") });
      else if (fe.newPassword || fe.currentPassword) setErrors({ current: fe.currentPassword ?? "", next: fe.newPassword ?? "" });
      else toast.error(errorMessage(err, t("public.errors.generic")));
    } finally { setBusy(false); }
  }

  return (
    <SettingsCard id="s-password" title={t("app.settings.password.title")} description={t("app.settings.password.body")}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <PasswordField label={t("app.settings.password.current")} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
        <PasswordField label={t("app.settings.password.next")} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} showRules />
        <Button type="submit" loading={busy}>{t("app.settings.password.update")}</Button>
      </form>
    </SettingsCard>
  );
}

export function EmailSection() {
  const { t } = useT();
  const toast = useToast();
  const { me, setMe } = useMe();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n: Record<string, string> = {};
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) n.email = t("auth.login.emailInvalid");
    else if (parsed.data === me.user.email.toLowerCase()) n.email = t("app.settings.email.same");
    setErrors(n);
    if (Object.keys(n).length || !parsed.success) return;
    setBusy(true);
    try {
      const user = await api.auth.changeEmail({ email: parsed.data });
      setMe({ ...me, user });
      setEmail("");
      toast.success(t("app.settings.email.changed"));
    } catch (err) {
      const fe = fieldErrors(err);
      if (isApiError(err) && err.status === 409) setErrors({ email: t("app.settings.email.taken") });
      else if (fe.email) setErrors({ email: fe.email });
      else toast.error(errorMessage(err, t("public.errors.generic")));
    } finally { setBusy(false); }
  }
  async function resend() {
    setResending(true);
    try { await api.auth.resendVerification(); toast.success(t("app.verify.toast")); } catch (err) { toast.error(errorMessage(err, t("public.errors.generic"))); } finally { setResending(false); }
  }

  return (
    <SettingsCard id="s-email" title={t("app.settings.email.title")} description={t("app.settings.email.body")}>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md bg-raised/60 px-4 py-3">
        <span dir="ltr" className="font-mono text-sm [overflow-wrap:anywhere]">{me.user.email}</span>
        {me.user.emailVerified
          ? <Badge tone="success"><BadgeCheck className="size-3" aria-hidden />{t("app.settings.email.verified")}</Badge>
          : <><Badge tone="warning"><MailWarning className="size-3" aria-hidden />{t("app.settings.email.unverified")}</Badge><Button size="sm" variant="outline" loading={resending} onClick={resend}>{t("app.verify.resend")}</Button></>}
      </div>
      <form onSubmit={submit} noValidate className="space-y-4">
        <InputField label={t("app.settings.email.new")} type="email" dir="ltr" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} hint={t("app.settings.email.hint")} className="[&_input]:text-start" />
        <p className="rounded-md bg-raised/60 px-4 py-3 text-sm text-muted" role="note">{t("app.settings.email.note")}</p>
        <Button type="submit" loading={busy}>{t("app.settings.email.change")}</Button>
      </form>
    </SettingsCard>
  );
}

export function LogoutSection() {
  const { t } = useT();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try { await api.auth.logout(); } catch { /* already signed out */ }
    toast.info(t("app.nav.loggedOut"));
    router.replace("/login");
    router.refresh();
  }
  return (
    <SettingsCard id="s-account" title={t("app.settings.session.title")}>
      <Button variant="outline" loading={busy} onClick={logout} leading={<LogOut className="size-4" aria-hidden />}>{t("app.settings.session.logOut")}</Button>
    </SettingsCard>
  );
}
