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

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Your profile, safety and account." />
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
