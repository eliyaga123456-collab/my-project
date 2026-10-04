"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { LIMITS, registerInput, usernameSchema } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { isolateIn } from "@/i18n/format";
import { rich } from "@/lib/rich";
import { api } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { Button, InputField } from "@/components/ui";
import { FormAlert } from "./AuthCard";
import { PasswordField } from "./PasswordField";

type Avail = { state: "idle" } | { state: "checking" } | { state: "invalid" } | { state: "available" } | { state: "taken" } | { state: "unknown" };

export function SignupForm() {
  const { t, locale } = useT();
  const router = useRouter();
  const [host, setHost] = useState("");
  useEffect(() => setHost(window.location.host), []);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [avail, setAvail] = useState<Avail>({ state: "idle" });

  useEffect(() => {
    if (!username) { setAvail({ state: "idle" }); return; }
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) { setAvail({ state: "invalid" }); return; }
    setAvail({ state: "checking" });
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const r = await api.auth.usernameAvailable(parsed.data);
        if (!cancelled) setAvail({ state: r.available ? "available" : "taken" });
      } catch {
        if (!cancelled) setAvail({ state: "unknown" });
      }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [username]);

  const availHint = (() => {
    switch (avail.state) {
      case "checking": return <span aria-live="polite" className="inline-flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" aria-hidden />{t("auth.signup.checking")}</span>;
      case "available": return <span aria-live="polite" className="inline-flex items-center gap-1.5 text-success"><Check className="size-3.5" aria-hidden />{t("auth.signup.available", { name: isolateIn(locale, username.toLowerCase()) })}</span>;
      default: return t("auth.signup.usernameHint", { min: LIMITS.usernameMin, max: LIMITS.usernameMax, link: isolateIn(locale, `${host || "ear"}/u/${username.toLowerCase() || "you"}`) });
    }
  })();
  const usernameError = avail.state === "invalid" ? t("auth.signup.usernameInvalid", { min: LIMITS.usernameMin, max: LIMITS.usernameMax }) : avail.state === "taken" ? t("auth.signup.taken") : errors.username;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = registerInput.safeParse({ email, password, username, displayName: displayName || undefined });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const k = String(i.path[0] ?? "form");
        next[k] ??= k === "email" ? t("auth.signup.emailInvalid")
          : k === "username" ? t("auth.signup.usernameInvalid", { min: LIMITS.usernameMin, max: LIMITS.usernameMax })
          : k === "password" ? t("auth.signup.passwordInvalid", { min: LIMITS.passwordMin, max: LIMITS.passwordMax })
          : t("auth.signup.displayNameInvalid");
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.auth.register(parsed.data);
      router.replace("/inbox");
      router.refresh();
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      if (Object.keys(fe).length === 0 || (!fe.email && !fe.username && !fe.password)) setFormError(errorMessage(err, t("public.errors.generic")));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <InputField label={t("auth.signup.email")} type="email" autoComplete="email" inputMode="email" dir="auto" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
      <div>
        <InputField
          label={t("auth.signup.username")}
          dir="auto"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value.trim())}
          error={usernameError}
          hint={usernameError ? undefined : availHint}
          trailing={avail.state === "available" ? <Check className="size-5 text-success" aria-hidden /> : avail.state === "taken" || avail.state === "invalid" ? <X className="size-5 text-danger" aria-hidden /> : undefined}
          maxLength={LIMITS.usernameMax + 8}
          required
        />
      </div>
      <InputField label={t("auth.signup.displayName")} dir="auto" autoComplete="nickname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={LIMITS.displayNameMax} error={errors.displayName} />
      <PasswordField label={t("auth.signup.password")} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} showRules required />
      <Button type="submit" size="lg" className="w-full" loading={busy}>{t("auth.signup.submit")}</Button>
      <p className="text-center text-xs text-muted">{rich(t("auth.signup.terms"), { terms: (c) => <a className="underline" href="/terms">{c}</a>, privacy: (c) => <a className="underline" href="/privacy">{c}</a> })}</p>
    </form>
  );
}
