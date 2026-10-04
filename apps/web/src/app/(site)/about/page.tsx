import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "About", description: "Why we built EAR." };

export default function About() {
  return (
    <LegalPage title="About EAR" intro="Some of the most honest things people say are the ones they'd never say with their name attached.">
      <h2>Why it exists</h2>
      <p>EAR stands for <strong>Eliya&apos;s Anonymous Replies</strong>. It gives you a link and gives your friends, fans and curious strangers a safe place to ask, confess and compliment without the pressure of being seen. The best messages are often the small ones: a question you never asked, a thank-you that felt too awkward to say out loud.</p>
      <h2>What we believe</h2>
      <ul>
        <li><strong>Anonymity should come with care.</strong> Filters, hidden words, blocking and human review are part of the product, not an afterthought.</li>
        <li><strong>Honesty about limits.</strong> We never claim to identify senders, and we say clearly what blocking can and cannot do.</li>
        <li><strong>You are in charge.</strong> You choose what to read, what to answer and what to share publicly.</li>
        <li><strong>Collect less.</strong> The only technical signal we keep about senders is a keyed hash, for no more than 30 days. Read the details in our <Link href="/privacy">Privacy page</Link>.</li>
      </ul>
      <h2>A dedication</h2>
      <p>The asterisk in EAR<span aria-hidden="true">*</span> is on purpose: <strong>* For Liron <span aria-hidden="true">&#128155;</span></strong></p>
      <h2>Get started</h2>
      <p><Link href="/signup">Create your profile</Link> and see what people have been meaning to say.</p>
    </LegalPage>
  );
}
