import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Terms", description: "The rules for using EAR." };

export default function Terms() {
  return (
    <LegalPage title="Terms of use" intro="The short version: be kind, be honest, and don't use EAR to hurt anyone." updated="October 2026">
      <h2>Using EAR</h2>
      <p>You must be old enough to use online services in your country and, where required, have a parent&apos;s permission. You are responsible for your account and for keeping your password secure.</p>
      <h2>What you may not do</h2>
      <ul>
        <li>Harass, threaten, bully or demean anyone, or encourage others to.</li>
        <li>Post hateful content, sexual content involving minors, or content that promotes self-harm or dangerous acts.</li>
        <li>Share someone&apos;s private information or impersonate another person.</li>
        <li>Send spam, run automated floods, or try to bypass rate limits, filters, blocks or proof-of-work challenges.</li>
        <li>Attempt to identify anonymous senders by technical means or to attack the service.</li>
      </ul>
      <h2>Anonymous messages</h2>
      <p>Anonymous does not mean unaccountable. Messages are filtered automatically and reviewable by moderators when reported. We may remove messages, limit access, suspend or ban accounts and sources that break these terms. See <Link href="/safety">Safety</Link> and <Link href="/privacy">Privacy</Link>.</p>
      <h2>Your content</h2>
      <p>You keep ownership of what you write and publish. By choosing to publish a reply publicly you allow us to display it on your profile and in share cards. The anonymous question shown with it is displayed as written, without any sender information. You can remove public replies at any time.</p>
      <h2>Availability</h2>
      <p>We work to keep EAR running but provide it &ldquo;as is&rdquo;, without guarantees. Features may change. To the extent the law allows, we are not liable for indirect or consequential losses arising from your use of the service.</p>
      <h2>Ending your use</h2>
      <p>You can delete your account at any time. We may suspend or end access for serious or repeated violations.</p>
      <h2>Changes</h2>
      <p>If these terms change in a meaningful way we will tell you in the app before they take effect.</p>
    </LegalPage>
  );
}
