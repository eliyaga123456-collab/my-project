import { Lock, MessageCircle } from "lucide-react";
import type { AnswerDto, PublicProfileDto } from "@unsaid/shared";
import { Avatar, EmptyState, LogoMark } from "@/components/ui";
import { SendForm, type SendTarget } from "./SendForm";
import { AnswerCard } from "./AnswerCard";
import { MoreAnswers } from "./MoreAnswers";
import { getT } from "@/i18n/server";
import { isolateIn } from "@/i18n/format";
import { RecordView } from "./RecordView";
import { whatsappUrl } from "@/lib/avatar";

export async function ProfileView({ profile, target, answers, nextCursor }: { profile: PublicProfileDto; target: SendTarget; answers: AnswerDto[]; nextCursor: string | null }) {
  const { t, locale } = await getT();
  const closed = profile.linkState === "closed";
  const paused = profile.linkState === "paused" || !profile.acceptingMessages;
  const prompt = profile.prompt?.trim() || t("public.profile.defaultPrompt");
  const now = Date.now();
  return (
    <div className="animate-ink-in">
      <RecordView target={target} />
      <section aria-labelledby="who" className="text-center">
        <span className="halo relative mx-auto block w-fit">
          <Avatar name={profile.displayName} src={profile.avatarUrl} size={96} frame={profile.avatarFrame} />
          <span className="absolute -bottom-1 -end-1 grid size-9 place-items-center rounded-full border border-line bg-surface shadow-lg" aria-hidden><LogoMark size={22} animated /></span>
        </span>
        <h1 id="who" dir="auto" className="mt-4 text-3xl font-extrabold sm:text-4xl [overflow-wrap:anywhere]">{profile.displayName}</h1>
        <p className="text-muted" dir="ltr">@{profile.username}</p>
        {profile.linkLabel && <p className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/60 px-3 py-1 text-xs font-semibold text-secondary">{closed ? t("public.profile.roundClosed") : t("public.profile.round")} · {profile.linkLabel}</p>}
        {profile.bio && <p dir="auto" className="mx-auto mt-3 max-w-md [overflow-wrap:anywhere]">{profile.bio}</p>}
        {profile.whatsapp && /^\d{7,15}$/.test(profile.whatsapp) && (
          <a href={whatsappUrl(profile.whatsapp)} target="_blank" rel="noopener noreferrer" className="group mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25d366] px-5 text-sm font-bold text-[#06210f] shadow-[0_10px_28px_-10px_#25d366] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-8px_#25d366]">
            <MessageCircle className="size-4 transition-transform group-hover:rotate-[-8deg] group-hover:scale-110" aria-hidden />
            {t("public.profile.whatsapp")}
            <span className="sr-only">{t("public.share.newTab")}</span>
          </a>
        )}
      </section>

      <section aria-labelledby="ask" className="veil notch send-card mt-8 p-5 sm:p-7">
        <h2 id="ask" className="mb-4 flex items-start gap-3 text-xl font-bold leading-snug sm:text-2xl">
          <Lock className="mt-1.5 size-4 shrink-0 text-secondary" aria-hidden />
          <span dir="auto" className="[overflow-wrap:anywhere]">{prompt}</span>
        </h2>
        <SendForm target={target} displayName={profile.displayName} initiallyPaused={paused} initiallyClosed={closed} />
      </section>

      <section aria-labelledby="answers" className="mt-12">
        <h2 id="answers" className="mb-4 text-2xl font-extrabold">{t("public.profile.answers")}</h2>
        {answers.length === 0 ? (
          <EmptyState title={t("public.profile.emptyTitle")} description={t("public.profile.emptyBody", { name: isolateIn(locale, profile.displayName) })} />
        ) : (
          <div className="stagger space-y-4">
            {answers.map((a) => <AnswerCard key={a.id} answer={a} now={now} />)}
            {nextCursor && <MoreAnswers username={profile.username} initialCursor={nextCursor} />}
          </div>
        )}
      </section>
    </div>
  );
}
