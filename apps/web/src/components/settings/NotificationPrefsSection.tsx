"use client";

import type { NotificationPrefs } from "@unsaid/shared";
import { Switch } from "@/components/ui";
import { useT } from "@/i18n/client";
import type { Key } from "@/i18n/translate";
import { useMe } from "@/components/app/MeProvider";
import { SettingsCard } from "./parts";
import { useSettingsUpdate } from "./SafetySection";

const rows: { key: keyof NotificationPrefs; label: Key; description: Key }[] = [
  { key: "inAppNewMessage", label: "app.settings.notify.inAppNewMessage", description: "app.settings.notify.inAppNewMessageBody" },
  { key: "pushNewMessage", label: "app.settings.notify.pushNewMessage", description: "app.settings.notify.pushNewMessageBody" },
  { key: "pushActivity", label: "app.settings.notify.pushActivity", description: "app.settings.notify.pushActivityBody" },
  { key: "emailNewMessage", label: "app.settings.notify.emailNewMessage", description: "app.settings.notify.emailNewMessageBody" },
  { key: "emailDigest", label: "app.settings.notify.emailDigest", description: "app.settings.notify.emailDigestBody" },
  { key: "emailSafety", label: "app.settings.notify.emailSafety", description: "app.settings.notify.emailSafetyBody" }
];

export function NotificationPrefsSection() {
  const { t } = useT();
  const { me } = useMe();
  const update = useSettingsUpdate();
  const n = me.settings.notifications;
  return (
    <SettingsCard id="s-notify" title={t("app.settings.notify.title")} description={t("app.settings.notify.body")}>
      <div className="divide-y divide-line">
        {rows.map((r) => (
          <Switch key={r.key} label={t(r.label)} description={t(r.description)} checked={n[r.key]} onChange={(v) => update({ notifications: { [r.key]: v } }, { ...me.settings, notifications: { ...n, [r.key]: v } })} />
        ))}
      </div>
    </SettingsCard>
  );
}
