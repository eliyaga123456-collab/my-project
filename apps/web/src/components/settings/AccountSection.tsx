"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { LIMITS, passwordSchema } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import { errorMessage, fieldErrors, isApiError } from "@/lib/errors";
import { Button, useToast } from "@/components/ui";
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
