"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { LIMITS, usernameSchema } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { Button, ConfirmDialog, InputField, useToast } from "@/components/ui";
import { useMe } from "@/components/app/MeProvider";
import { SettingsCard } from "./parts";

export function UsernameSection() {
  const { me, setMe } = useMe();
  const toast = useToast();
  const [value, setValue] = useState(me.profile.username);
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken" | "unknown">("idle");
  const [formatError, setFormatError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = value.toLowerCase() !== me.profile.username;

  useEffect(() => {
    setError(null);
    if (!changed) { setStatus("idle"); setFormatError(null); return; }
    const p = usernameSchema.safeParse(value);
    if (!p.success) { setFormatError(p.error.issues[0]?.message ?? "Invalid username"); setStatus("idle"); return; }
    setFormatError(null);
    setStatus("checking");
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try { const r = await api.auth.usernameAvailable(p.data); if (!cancelled) setStatus(r.available ? "ok" : "taken"); } catch { if (!cancelled) setStatus("unknown"); }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [value, changed]);

  async function apply() {
    setBusy(true);
    try {
      const profile = await api.profile.changeUsername(usernameSchema.parse(value));
      setMe({ ...me, profile, user: { ...me.user, username: profile.username } });
      toast.success("Username changed");
      setConfirm(false);
    } catch (e) { setConfirm(false); setError(errorMessage(e)); } finally { setBusy(false); }
  }

  const hint = status === "checking" ? "Checking…" : status === "ok" ? <span className="inline-flex items-center gap-1 text-success"><Check className="size-3.5" aria-hidden />Available</span> : `Your link: /u/${value.toLowerCase()}`;
  const err = formatError ?? (status === "taken" ? "That username is taken." : error);

  return (
    <SettingsCard id="s-username" title="Username" description="Changing it breaks your old link immediately. You can change it once every 7 days.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <InputField className="flex-1" label="Username" value={value} onChange={(e) => setValue(e.target.value.trim())} maxLength={LIMITS.usernameMax} autoCapitalize="none" spellCheck={false} error={err} hint={err ? undefined : hint} />
        <Button className="sm:mt-7" disabled={!changed || status !== "ok"} onClick={() => setConfirm(true)}>Change username</Button>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={apply} loading={busy} title="Change username?" confirmLabel="Change it" description={`Your link will become /u/${value.toLowerCase()}. Anyone using the old link /u/${me.profile.username} will see a 404.`} />
    </SettingsCard>
  );
}
