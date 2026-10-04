"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { emailSchema } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { isolateIn } from "@/i18n/format";
import { rich } from "@/lib/rich";
import { Button, InputField } from "@/components/ui";
import { FormAlert } from "./AuthCard";

export function ForgotForm() {
  const { t, locale } = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError(t("auth.forgot.emailInvalid")); return; }
    setError(null);
    setBusy(true);
    try {
      await api.auth.forgotPassword(parsed.data);
      setSent(true);
    } catch (err) {
      setFormError(errorMessage(err, t("public.errors.generic")));
    } finally { setBusy(false); }
  }

  if (sent) {
    return (
      <div role="status" className="text-center animate-ink-in">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success/15 text-success"><MailCheck className="size-7" aria-hidden /></div>
        <p className="font-semibold">{t("auth.forgot.sentTitle")}</p>
        <p className="mt-1 text-sm text-muted">{rich(t("auth.forgot.sentBody", { email: isolateIn(locale, email) }), { b: (c) => <strong className="text-fg">{c}</strong> })}</p>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <InputField label={t("auth.forgot.email")} type="email" autoComplete="email" inputMode="email" dir="auto" value={email} onChange={(e) => setEmail(e.target.value)} error={error} required />
      <Button type="submit" size="lg" className="w-full" loading={busy}>{t("auth.forgot.submit")}</Button>
    </form>
  );
}
