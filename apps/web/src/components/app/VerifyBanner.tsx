"use client";

import { useState } from "react";
import { MailWarning } from "lucide-react";
import { useT } from "@/i18n/client";
import { isolateIn } from "@/i18n/format";
import { rich } from "@/lib/rich";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { Button, useToast } from "@/components/ui";
import { useMe } from "./MeProvider";

export function VerifyBanner() {
  const { t, locale } = useT();
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
      toast.success(t("app.verify.toast"));
    } catch (e) { toast.error(errorMessage(e, t("public.errors.generic"))); } finally { setBusy(false); }
  }

  return (
    <div role="region" aria-label={t("app.verify.region")} className="border-b border-warning/30 bg-warning/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-start gap-2"><MailWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> <span>{rich(t("app.verify.text", { email: isolateIn(locale, me.user.email) }))}</span></p>
        <Button size="sm" variant="outline" loading={busy} disabled={sent} onClick={resend}>{sent ? t("app.verify.sent") : t("app.verify.resend")}</Button>
      </div>
    </div>
  );
}
