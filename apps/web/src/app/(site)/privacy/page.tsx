import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy", description: "How Unsaid handles your data and how anonymity actually works." };

export default function Privacy() {
  return (
    <LegalPage title="Privacy" intro="Plain-language answers about what we collect, why, and for how long. Anonymity is the product, so we try to be precise about it." updated="October 2026">
      <h2>How anonymity works</h2>
      <p><strong>People who receive messages never see who sent them.</strong> We do not show recipients a sender&apos;s IP address, device, account or any identifier that links a message to a person. Message IDs shown in the app are random and unrelated to the sender.</p>
      <p>To keep the service usable and safe we do keep a limited technical signal for abuse prevention: <strong>a keyed hash of network information</strong> (an HMAC of the sender&apos;s IP address computed with a secret key held by our servers). It is not your IP address, it cannot be reversed without that key, and it is <strong>kept for at most 30 days</strong>, after which it is removed.</p>
      <p>That hash is used only to rate-limit floods, detect duplicate or repeated abuse, power the &ldquo;Block&rdquo; feature and correlate reports. Recipients never see it. Our moderators see only a short truncated reference, not an identity.</p>
      <h2>What anonymity does not mean</h2>
      <ul>
        <li>Blocking applies to an anonymous source. A determined person on a different network may be able to write again. We say this plainly instead of promising otherwise.</li>
        <li>We do not claim, and the product cannot tell you, who sent a message.</li>
        <li>If you write something that is unlawful or threatens serious harm, we may be required to respond to valid legal requests with the limited data we hold. We cannot disclose identities we do not store.</li>
        <li>What you write may itself reveal you (a name, a detail only you would know). Anonymity cannot protect against that.</li>
      </ul>
      <h2>Information we collect from account holders</h2>
      <ul>
        <li><strong>Account:</strong> email address, username, password (stored only as a salted scrypt hash), display name, bio, prompt and optional avatar.</li>
        <li><strong>Content:</strong> messages sent to you, your replies, links, hidden words, blocks and reports you file.</li>
        <li><strong>Technical:</strong> session records (a hashed session token, browser description, created and last-used times) so you can review and revoke sessions.</li>
        <li><strong>Usage counts:</strong> page views and message counts for your links, shown to you in Analytics.</li>
      </ul>
      <h2>Cookies</h2>
      <p>We use one strictly necessary cookie, <code>unsaid_session</code>, which is HttpOnly and keeps you signed in. Your theme preference is stored in your browser&apos;s local storage. We do not use advertising cookies or third-party trackers.</p>
      <h2>Moderation</h2>
      <p>Messages are checked automatically for harassment, threats, hate, sexual content, self-harm, personal information, dangerous content and spam. Flagged messages may be held in your Filtered folder or rejected. Reports you file are reviewed by our moderators, who can see the reported message and the surrounding report details.</p>
      <h2>Retention and deletion</h2>
      <ul>
        <li>Abuse-prevention hashes: removed within 30 days.</li>
        <li>Messages and replies: kept until you delete them or delete your account.</li>
        <li>Deleting your account removes your profile, links and messages.</li>
      </ul>
      <h2>Your choices</h2>
      <p>You can edit your profile, pause your link, add hidden words, change notification preferences, revoke sessions and delete messages from Settings at any time.</p>
      <h2>Contact</h2>
      <p>Questions or requests about your data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
