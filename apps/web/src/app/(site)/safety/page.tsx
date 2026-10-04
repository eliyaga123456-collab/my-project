import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { SAFETY_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Safety", description: "How EAR helps keep anonymous messaging kind, and what you can do." };

export default function Safety() {
  return (
    <LegalPage title="Safety" intro="Anonymous messages can be wonderful and can also be unkind. These are the layers we built to keep things on the wonderful side.">
      <h2>Protections that work for you</h2>
      <ul>
        <li><strong>Automatic filtering.</strong> Harassment, threats, hate, sexual content, personal information, dangerous content and spam are detected. Questionable messages go to a separate <em>Filtered</em> folder, and clearly abusive ones are not delivered.</li>
        <li><strong>Enhanced moderation.</strong> Turn on stricter filtering in Settings whenever you want.</li>
        <li><strong>Hidden words.</strong> Add words or phrases and any message containing them is kept out of your inbox.</li>
        <li><strong>Pause your link.</strong> Stop receiving messages instantly. Nothing is stored while paused.</li>
        <li><strong>Block.</strong> Block the anonymous source of a message. This is honest but not magic: someone on a different network may be able to try again, so combine blocking with reports and hidden words.</li>
        <li><strong>Report.</strong> Report any message with a reason. Reports go to human moderators.</li>
        <li><strong>Rate limits and challenges.</strong> Floods and repeated messages are slowed or stopped, and suspicious bursts must solve a small proof-of-work puzzle in the sender&apos;s browser.</li>
      </ul>
      <h2>If you are being harassed</h2>
      <ul>
        <li>You do not have to read or answer anything. Archive, delete or pause the link.</li>
        <li>Report the message so moderators can act on the source.</li>
        <li>Keep screenshots if you plan to contact local authorities or a trusted adult.</li>
      </ul>
      <h2>If you or someone you know is struggling</h2>
      <p>Messages mentioning self-harm are never silently dropped. They are held for you with supportive resources. If you are in immediate danger, contact your local emergency number. In many countries you can reach a free crisis line by calling or texting 988 (US) or finding a local helpline at findahelpline.com.</p>
      <h2>If you are sending messages</h2>
      <p>Be kind. Harassment is filtered and reportable. Remember that the person reading your message is a real person, and that we never tell them who you are, nor can they find out through us.</p>
      <h2>Reach our safety team</h2>
      <p>Urgent safety concerns about content or a user: <a href={`mailto:${SAFETY_EMAIL}`}>{SAFETY_EMAIL}</a>.</p>
    </LegalPage>
  );
}
