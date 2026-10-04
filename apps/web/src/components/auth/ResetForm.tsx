"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { LIMITS, passwordSchema } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import { errorMessage, isApiError } from "@/lib/errors";
import { Button, ButtonLink } from "@/components/ui";
import { FormAlert } from "./AuthCard";
import { PasswordField } from "./PasswordField";

export function ResetForm({ token }: { token?: string }) {
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div role="alert" className="space-y-4 text-center">
        <p className="font-semibold">{t("auth.reset.incompleteTitle")}</p>
        <p className="text-sm text-muted">{t("auth.reset.incompleteBody")}</p>
        <ButtonLink href="/install">{t("auth.openApp")}</ButtonLink>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const n: Record<string, string> = {};
    const p = passwordSchema.safeParse(password);
    if (!p.success) n.password = password.length < LIMITS.passwordMin ? t("auth.password.tooShort", { min: LIMITS.passwordMin }) : t("auth.reset.invalidPassword");
    if (confirm !== password) n.confirm = t("auth.reset.mismatch");
    setErrors(n);
    if (Object.keys(n).length || !token) return;
    setBusy(true);
    try {
      await api.auth.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setFormError(isApiError(err) && (err.code === "validation_error" || err.code === "not_found") ? t("auth.reset.invalidLink") : errorMessage(err, t("public.errors.generic")));
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div role="status" className="space-y-4 text-center animate-ink-in">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-success/15 text-success"><CheckCircle2 className="size-7" aria-hidden /></div>
        <p className="font-semibold">{t("auth.reset.doneTitle")}</p>
        <p className="text-sm text-muted">{t("auth.reset.doneBody")}</p>
        <ButtonLink href="/install" className="w-full">{t("auth.openApp")}</ButtonLink>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      {formError && <p className="text-center text-sm"><Link href="/install" className="text-secondary underline">{t("auth.reset.requestNew")}</Link></p>}
      <PasswordField label={t("auth.reset.newPassword")} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} showRules required />
      <PasswordField label={t("auth.reset.confirmPassword")} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} required />
      <Button type="submit" size="lg" className="w-full" loading={busy}>{t("auth.reset.submit")}</Button>
    </form>
  );
}
