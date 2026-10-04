import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { CONTACT_EMAIL, SAFETY_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: "Talk to the EAR team." };

export default function Contact() {
  return (
    <LegalPage title="Contact" intro="We read everything. Replies usually take one to two working days.">
      <h2>General &amp; support</h2>
      <p>Account help, bugs and feedback: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Include your username (never your password) and what you were doing when something went wrong.</p>
      <h2>Safety &amp; abuse</h2>
      <p>To flag harmful content or a harassment pattern, use the in-app Report button first since it gives moderators the exact message. For anything urgent or that needs context, write to <a href={`mailto:${SAFETY_EMAIL}`}>{SAFETY_EMAIL}</a>.</p>
      <h2>Privacy requests</h2>
      <p>To ask about data we hold, write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from your account email. Please note we cannot identify the author of an anonymous message, because we do not store that information.</p>
      <h2>Security</h2>
      <p>Found a vulnerability? Please email <a href={`mailto:${SAFETY_EMAIL}`}>{SAFETY_EMAIL}</a> with the details and give us a reasonable chance to fix it before disclosing it.</p>
    </LegalPage>
  );
}
