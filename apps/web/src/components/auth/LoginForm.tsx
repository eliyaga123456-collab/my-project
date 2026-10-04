"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginInput } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import { errorMessage, isApiError } from "@/lib/errors";
import { safeNext } from "@/lib/format";
import { Button, InputField } from "@/components/ui";
import { FormAlert } from "./AuthCard";
import { PasswordField } from "./PasswordField";

export function LoginForm({ next }: { next?: string }) {
  const { t } = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = loginInput.safeParse({ email, password });
    if (!parsed.success) {
      const n: Record<string, string> = {};
      for (const i of parsed.error.issues) n[String(i.path[0])] ??= i.path[0] === "email" ? t("auth.login.emailInvalid") : t("auth.login.passwordRequired");
      setErrors(n);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.auth.login(parsed.data);
      router.replace(safeNext(next));
      router.refresh();
    } catch (err) {
      setFormError(isApiError(err) && (err.status === 401 || err.code === "unauthorized" || err.code === "validation_error") ? t("auth.login.badCredentials") : errorMessage(err, t("public.errors.generic")));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <InputField label={t("auth.login.email")} type="email" autoComplete="email" inputMode="email" dir="auto" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
      <PasswordField label={t("auth.login.password")} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
      <div className="text-end text-sm"><Link href="/forgot-password" className="text-secondary underline-offset-4 hover:underline">{t("auth.login.forgot")}</Link></div>
      <Button type="submit" size="lg" className="w-full" loading={busy}>{t("auth.login.submit")}</Button>
    </form>
  );
}
