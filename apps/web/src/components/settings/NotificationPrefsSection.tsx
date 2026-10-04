"use client";

import type { NotificationPrefs } from "@unsaid/shared";
import { Switch } from "@/components/ui";
import { useMe } from "@/components/app/MeProvider";
import { SettingsCard } from "./parts";
import { useSettingsUpdate } from "./SafetySection";

const rows: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: "inAppNewMessage", label: "In-app: new messages", description: "Show new messages in your notification list." },
  { key: "pushNewMessage", label: "Push: new messages", description: "Mobile push when someone writes to you." },
  { key: "pushActivity", label: "Push: activity", description: "Updates about your public answers." },
  { key: "emailNewMessage", label: "Email: new messages", description: "An email for each new message." },
  { key: "emailDigest", label: "Email: weekly digest", description: "A calm summary instead of constant pings." },
  { key: "emailSafety", label: "Email: safety & account", description: "Security alerts and moderation notices." }
];

export function NotificationPrefsSection() {
  const { me } = useMe();
  const update = useSettingsUpdate();
  const n = me.settings.notifications;
  return (
    <SettingsCard id="s-notify" title="Notifications" description="Choose how we get your attention.">
      <div className="divide-y divide-line">
        {rows.map((r) => (
          <Switch key={r.key} label={r.label} description={r.description} checked={n[r.key]} onChange={(v) => update({ notifications: { [r.key]: v } }, { ...me.settings, notifications: { ...n, [r.key]: v } })} />
        ))}
      </div>
    </SettingsCard>
  );
}
