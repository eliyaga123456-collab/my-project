"use client";

import Link from "next/link";
import type { AnswerDto } from "@unsaid/shared";
import { Avatar } from "@/components/ui";
import { useT } from "@/i18n/client";
import { timeAgoT } from "@/lib/format";

export function AnswerCard({ answer, showAuthor = false, now }: { answer: AnswerDto; showAuthor?: boolean; now?: number }) {
  const tr = useT();
  return (
    <article className="veil p-5 sm:p-6">
      {showAuthor && (
        <Link href={`/u/${answer.author.username}`} className="mb-4 flex items-center gap-3">
          <Avatar name={answer.author.displayName} src={answer.author.avatarUrl} size={36} />
          <span className="text-sm font-semibold"><bdi>{answer.author.displayName}</bdi> <span className="font-normal text-muted" dir="ltr">@{answer.author.username}</span></span>
        </Link>
      )}
      <p dir="auto" className="inline-block max-w-full -rotate-1 rounded-md bg-raised px-3.5 py-2 text-[0.95rem] font-semibold leading-snug shadow-sm [overflow-wrap:anywhere]">{answer.question}</p>
      <p dir="auto" className="mt-4 whitespace-pre-wrap text-[1.05rem] leading-relaxed [overflow-wrap:anywhere]">{answer.answer}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <Link href={`/a/${answer.id}`} className="underline-offset-4 hover:underline"><time dateTime={answer.createdAt}>{timeAgoT(answer.createdAt, tr, now)}</time></Link>
        <Link href={`/a/${answer.id}`} className="font-semibold text-secondary underline-offset-4 hover:underline">{tr.t("public.answer.open")}</Link>
      </div>
    </article>
  );
}
