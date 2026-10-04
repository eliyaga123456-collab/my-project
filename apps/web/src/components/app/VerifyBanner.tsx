"use client";

import { useState } from "react";
import { MailWarning } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { Button, useToast } from "@/components/ui";
import { useMe } from "./MeProvider";

export function VerifyBanner() {
  const { me } = useMe();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  if (me.user.emailVerified) return null;

  async function resend() {
    setBusy(true);
    try {
      await api.auth.resendVerification();
      setSent(true);
      toast.success("Verification email sent. Check your inbox.");
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <div role="region" aria-label="Email verification" className="border-b border-warning/30 bg-warning/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-start gap-2"><MailWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> <span>Verify <strong>{me.user.email}</strong> to publish public answers.</span></p>
        <Button size="sm" variant="outline" loading={busy} disabled={sent} onClick={resend}>{sent ? "Email sent" : "Resend verification email"}</Button>
      </div>
    </div>
  );
}
