"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { passwordSchema } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage, isApiError } from "@/lib/errors";
import { Button, ButtonLink } from "@/components/ui";
import { FormAlert } from "./AuthCard";
import { PasswordField } from "./PasswordField";

export function ResetForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div role="alert" className="space-y-4 text-center">
        <p className="font-semibold">This reset link is incomplete.</p>
        <p className="text-sm text-muted">Request a new one and use the link from the latest email.</p>
        <ButtonLink href="/install">Open the EAR app</ButtonLink>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const n: Record<string, string> = {};
    const p = passwordSchema.safeParse(password);
    if (!p.success) n.password = p.error.issues[0]?.message ?? "Invalid password";
    if (confirm !== password) n.confirm = "Passwords don't match";
    setErrors(n);
    if (Object.keys(n).length || !token) return;
    setBusy(true);
    try {
      await api.auth.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setFormError(isApiError(err) && (err.code === "validation_error" || err.code === "not_found") ? "This reset link is invalid or has expired. Request a new one." : errorMessage(err));
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div role="status" className="space-y-4 text-center animate-ink-in">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-success/15 text-success"><CheckCircle2 className="size-7" aria-hidden /></div>
        <p className="font-semibold">Password updated</p>
        <p className="text-sm text-muted">You&apos;ve been signed out everywhere. Log in with your new password.</p>
        <ButtonLink href="/install" className="w-full">Open the EAR app</ButtonLink>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      {formError && <p className="text-center text-sm"><Link href="/install" className="text-secondary underline">Request a new link in the app</Link></p>}
      <PasswordField label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} showRules required />
      <PasswordField label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} required />
      <Button type="submit" size="lg" className="w-full" loading={busy}>Set new password</Button>
    </form>
  );
}
