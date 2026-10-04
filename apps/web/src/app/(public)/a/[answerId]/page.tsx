import type { Metadata } from "next";
import Link from "next/link";
import { AnswerCard } from "@/components/public/AnswerCard";
import { ShareActions } from "@/components/public/ShareActions";
import { ButtonLink } from "@/components/ui";
import { getAnswer } from "@/lib/public-data";

type Props = { params: Promise<{ answerId: string }> };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { answerId } = await params;
  const a = await getAnswer(answerId);
  const title = `${a.author.displayName} answered: “${clip(a.question, 70)}”`;
  const description = clip(a.answer, 200);
  return {
    title,
    description,
    alternates: { canonical: `/a/${a.id}` },
    openGraph: { type: "article", title, description, url: `/a/${a.id}`, authors: [a.author.displayName] },
    twitter: { card: "summary_large_image", title, description }
  };
}

export default async function AnswerPage({ params }: Props) {
  const { answerId } = await params;
  const a = await getAnswer(answerId);
  return (
    <div className="animate-ink-in space-y-8">
      <AnswerCard answer={a} showAuthor now={Date.now()} />
      <section aria-labelledby="share" className="veil p-5 sm:p-6">
        <h2 id="share" className="mb-3 text-lg font-bold">Share this answer</h2>
        <ShareActions path={`/a/${a.id}`} text={`${a.author.displayName} on EAR: “${clip(a.question, 90)}”`} cardPath={`/api/share-card/${a.id}`} />
      </section>
      <section className="text-center">
        <p className="text-muted">Want to ask {a.author.displayName} something?</p>
        <div className="mt-3 flex flex-col justify-center gap-2 xs:flex-row">
          <ButtonLink href={`/u/${a.author.username}`}>Send an anonymous message</ButtonLink>
          <ButtonLink href="/install" variant="outline">Make your own link</ButtonLink>
        </div>
        <p className="mt-4 text-xs text-muted">Questions are anonymous. <Link href="/safety" className="underline">How we keep it kind</Link>.</p>
      </section>
    </div>
  );
}
