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
import { useT, type Key } from "@/i18n";
import { useAuth } from "@/providers/AuthProvider";
import { registerForPush } from "@/lib/push";

const ROWS: { key: keyof NotificationPrefs; label: Key; description?: Key }[] = [
  { key: "inAppNewMessage", label: "settings.notifications.inAppNewMessage" },
  { key: "pushNewMessage", label: "settings.notifications.pushNewMessage", description: "settings.notifications.pushNewMessageDesc" },
  { key: "pushActivity", label: "settings.notifications.pushActivity", description: "settings.notifications.pushActivityDesc" },
  { key: "emailNewMessage", label: "settings.notifications.emailNewMessage" },
  { key: "emailDigest", label: "settings.notifications.emailDigest" },
  { key: "emailSafety", label: "settings.notifications.emailSafety" }
];

export default function NotificationSettings() {
  const toast = useToast();
  const { t } = useT();
  const { me, patchMe } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  if (!me) return null;
  const prefs: Partial<NotificationPrefs> = me.settings?.notifications ?? {};

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
      <SubHeader title={t("settings.notifications.title")} />
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
        {ROWS.map((r) => <SwitchRow key={r.key} label={t(r.label)} description={r.description ? t(r.description) : undefined} value={!!prefs[r.key]} disabled={busyKey === r.key} onChange={(v) => set(r.key, v)} />)}
      </Card>
      <Text variant="caption" tone="muted">{t("settings.notifications.footnote")}</Text>
    </Screen>
  );
}
