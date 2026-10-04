import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { UsernameSection } from "@/components/settings/UsernameSection";
import { SafetySection } from "@/components/settings/SafetySection";
import { BlockedSection } from "@/components/settings/BlockedSection";
import { NotificationPrefsSection } from "@/components/settings/NotificationPrefsSection";
import { SessionsSection } from "@/components/settings/SessionsSection";
import { PasswordSection, LogoutSection } from "@/components/settings/AccountSection";
import { GetAppSection } from "@/components/settings/GetAppSection";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("app.pages.settingsTitle") };
}

export default async function SettingsPage() {
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("app.pages.settingsTitle")} description={t("app.pages.settingsDescription")} />
      <div className="space-y-6">
        <GetAppSection />
        <ProfileSection />
        <UsernameSection />
        <SafetySection />
        <BlockedSection />
        <NotificationPrefsSection />
        <SessionsSection />
        <PasswordSection />
        <LogoutSection />
      </div>
    </>
  );
}
