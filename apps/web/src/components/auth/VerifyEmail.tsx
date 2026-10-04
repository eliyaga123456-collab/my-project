"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { ButtonLink } from "@/components/ui";
import { useT } from "@/i18n/client";

export function VerifyEmail({ token }: { token?: string }) {
  const { t } = useT();
  const [state, setState] = useState<"loading" | "ok" | "bad" | "missing">(token ? "loading" : "missing");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true; // tokens are single-use; never submit twice (React strict mode)
    api.auth.verifyEmail(token).then(() => setState("ok"), () => setState("bad"));
  }, [token]);

  if (state === "loading") {
    return <div role="status" className="flex flex-col items-center gap-3 py-4 text-center"><Loader2 className="size-9 animate-spin text-secondary" aria-hidden /><p className="font-medium">{t("auth.verify.loading")}</p></div>;
  }
  if (state === "ok") {
    return (
      <div role="status" className="space-y-4 text-center animate-ink-in">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-success/15 text-success"><CheckCircle2 className="size-7" aria-hidden /></div>
        <p className="font-semibold">{t("auth.verify.okTitle")}</p>
        <p className="text-sm text-muted">{t("auth.verify.okBody")}</p>
        <ButtonLink href="/install" className="w-full">{t("auth.openApp")}</ButtonLink>
      </div>
    );
  }
  return (
    <div role="alert" className="space-y-4 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-danger/15 text-danger"><XCircle className="size-7" aria-hidden /></div>
      <p className="font-semibold">{state === "missing" ? t("auth.verify.missing") : t("auth.verify.invalid")}</p>
      <p className="text-sm text-muted">{t("auth.verify.badBody")}</p>
      <ButtonLink href="/install" className="w-full">{t("auth.openApp")}</ButtonLink>
    </div>
  );
}
