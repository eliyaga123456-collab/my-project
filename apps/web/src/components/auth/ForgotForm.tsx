"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { emailSchema } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { Button, InputField } from "@/components/ui";
import { FormAlert } from "./AuthCard";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError("Enter a valid email address"); return; }
    setError(null);
    setBusy(true);
    try {
      await api.auth.forgotPassword(parsed.data);
      setSent(true);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally { setBusy(false); }
  }

  if (sent) {
    return (
      <div role="status" className="text-center animate-ink-in">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success/15 text-success"><MailCheck className="size-7" aria-hidden /></div>
        <p className="font-semibold">Check your inbox</p>
        <p className="mt-1 text-sm text-muted">If an account exists for <strong className="text-fg">{email}</strong>, a reset link is on its way. It expires soon, so use it right away.</p>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <InputField label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} required />
      <Button type="submit" size="lg" className="w-full" loading={busy}>Send reset link</Button>
    </form>
  );
}
