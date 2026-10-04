"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { passwordSchema } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage, fieldErrors, isApiError } from "@/lib/errors";
import { Button, useToast } from "@/components/ui";
import { PasswordField } from "@/components/auth/PasswordField";
import { SettingsCard } from "./parts";

export function PasswordSection() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n: Record<string, string> = {};
    if (!current) n.current = "Enter your current password";
    const p = passwordSchema.safeParse(next);
    if (!p.success) n.next = p.error.issues[0]?.message ?? "Invalid password";
    setErrors(n);
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      await api.auth.changePassword({ currentPassword: current, newPassword: next });
      setCurrent(""); setNext("");
      toast.success("Password changed. Other devices were signed out.");
    } catch (err) {
      const fe = fieldErrors(err);
      if (isApiError(err) && (err.status === 401 || err.status === 403 || err.code === "forbidden")) setErrors({ current: "Current password is incorrect" });
      else if (fe.newPassword || fe.currentPassword) setErrors({ current: fe.currentPassword ?? "", next: fe.newPassword ?? "" });
      else toast.error(errorMessage(err));
    } finally { setBusy(false); }
  }

  return (
    <SettingsCard id="s-password" title="Change password" description="This signs you out of your other devices.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <PasswordField label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
        <PasswordField label="New password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} showRules />
        <Button type="submit" loading={busy}>Update password</Button>
      </form>
    </SettingsCard>
  );
}

export function LogoutSection() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try { await api.auth.logout(); } catch { /* already signed out */ }
    toast.info("Logged out");
    router.replace("/login");
    router.refresh();
  }
  return (
    <SettingsCard id="s-account" title="Session">
      <Button variant="outline" loading={busy} onClick={logout} leading={<LogOut className="size-4" aria-hidden />}>Log out of this device</Button>
    </SettingsCard>
  );
}
