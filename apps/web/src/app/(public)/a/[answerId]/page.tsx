import type { Metadata } from "next";
import Link from "next/link";
import { AnswerCard } from "@/components/public/AnswerCard";
import { ShareActions } from "@/components/public/ShareActions";
import { ButtonLink } from "@/components/ui";
import { getAnswer } from "@/lib/public-data";
import { getT } from "@/i18n/server";
import { isolateIn } from "@/i18n/format";
import { rich } from "@/lib/rich";

type Props = { params: Promise<{ answerId: string }> };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { answerId } = await params;
  const a = await getAnswer(answerId);
  const { t, locale } = await getT();
  const title = t("public.meta.answerTitle", { name: isolateIn(locale, a.author.displayName), question: clip(a.question, 70) });
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
  const { t, locale } = await getT();
  const name = isolateIn(locale, a.author.displayName);
  return (
    <div className="animate-ink-in space-y-8">
      <AnswerCard answer={a} showAuthor now={Date.now()} />
      <section aria-labelledby="share" className="veil p-5 sm:p-6">
        <h2 id="share" className="mb-3 text-lg font-bold">{t("public.answer.shareTitle")}</h2>
        <ShareActions path={`/a/${a.id}`} text={t("public.answer.shareText", { name, question: clip(a.question, 90) })} cardPath={`/api/share-card/${a.id}`} />
      </section>
      <section className="text-center">
        <p className="text-muted">{t("public.answer.askPrompt", { name })}</p>
        <div className="mt-3 flex flex-col justify-center gap-2 xs:flex-row">
          <ButtonLink href={`/u/${a.author.username}`}>{t("public.answer.sendButton")}</ButtonLink>
          <ButtonLink href="/install" variant="outline">{t("public.layout.makeLink")}</ButtonLink>
        </div>
        <p className="mt-4 text-xs text-muted">{rich(t("public.answer.note"), { link: (c) => <Link href="/safety" className="underline">{c}</Link> })}</p>
      </section>
    </div>
  );
}
