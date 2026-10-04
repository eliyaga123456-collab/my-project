import { useState } from "react";
import type { NotificationPrefs } from "@unsaid/shared";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorState";
import { SwitchRow } from "@/components/SettingRow";
import { Screen } from "@/components/Screen";
import { SubHeader } from "@/components/SubHeader";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";
import { registerForPush } from "@/lib/push";

const ROWS: { key: keyof NotificationPrefs; label: string; description?: string }[] = [
  { key: "inAppNewMessage", label: "In-app: new messages" },
  { key: "pushNewMessage", label: "Push: new messages", description: "A nudge when someone writes to you." },
  { key: "pushActivity", label: "Push: activity", description: "Safety and account updates." },
  { key: "emailNewMessage", label: "Email: new messages" },
  { key: "emailDigest", label: "Email: daily digest" },
  { key: "emailSafety", label: "Email: safety alerts" }
];

export default function NotificationSettings() {
  const toast = useToast();
  const { me, patchMe } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  if (!me) return null;
  const prefs = me.settings.notifications;

  const set = async (key: keyof NotificationPrefs, value: boolean) => {
    setBusyKey(key); setError(null);
    try {
      const s = await api.settings.update({ notifications: { [key]: value } });
      patchMe((m) => ({ ...m, settings: s }));
      if (key === "pushNewMessage" && value) void registerForPush();
    } catch (e) { setError(errorMessage(e)); toast.show(errorMessage(e), "error"); }
    setBusyKey(null);
  };

  return (
    <Screen>
      <SubHeader title="Notifications" />
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
        {ROWS.map((r) => <SwitchRow key={r.key} label={r.label} description={r.description} value={prefs[r.key]} disabled={busyKey === r.key} onChange={(v) => set(r.key, v)} />)}
      </Card>
      <Text variant="caption" tone="muted">Push notifications also need permission in your device settings.</Text>
    </Screen>
  );
}
