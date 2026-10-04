import { Heart, Lock, Share2 } from "lucide-react";
import { Avatar } from "@/components/ui";
import { getT } from "@/i18n/server";

const msgs = [
  { t: "site.preview.t1", q: "site.preview.q1", unread: true },
  { t: "site.preview.t2", q: "site.preview.q2", unread: true },
  { t: "site.preview.t3", q: "site.preview.q3", unread: false }
] as const;

/** Static, decorative mock of the inbox. Purely presentational (aria-hidden), animated with CSS only. */
export async function InboxPreview() {
  const { t } = await getT();
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md">
      <div className="blob animate-drift -left-10 top-10 size-56" style={{ background: "#ff7440" }} />
      <div className="blob animate-drift -right-8 bottom-0 size-64" style={{ background: "var(--grad-3)", animationDelay: "-6s" }} />
      <div className="veil relative p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <Avatar name="Mara Vale" size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{t("site.preview.inbox")}</p>
            <p className="flex items-center gap-1 text-xs text-muted"><Lock className="size-3" /> {t("site.preview.anonymousSenders")}</p>
          </div>
          <span className="grad-bg ms-auto rounded-full px-2.5 py-0.5 text-xs font-bold text-[#1a0d07]">{t("site.preview.newCount")}</span>
        </div>
        <div className="space-y-3">
          {msgs.map((m, i) => (
            <div
              key={m.q}
              className={`veil p-4 ${m.unread ? "veil-unread" : ""}`}
              style={{ animation: "ink-in .5s var(--ease) both", animationDelay: `${0.25 + i * 0.28}s`, boxShadow: m.unread ? undefined : "none" }}
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted">{t("site.preview.anonymous")} · {t(m.t)}</p>
              <p className="mt-1.5 text-[0.95rem] font-medium leading-snug">{t(m.q)}</p>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
                <span className="grad-bg rounded-full px-3 py-1.5 text-[#1a0d07]">{t("site.preview.reply")}</span>
                <span className="rounded-full bg-raised px-3 py-1.5 text-muted">{t("site.preview.share")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="animate-float absolute -bottom-8 -end-2 hidden w-60 rounded-lg border border-line bg-surface p-3 shadow-[var(--shadow)] sm:block" style={{ ["--r" as string]: "5deg" }}>
        <div className="-rotate-3 rounded-md grad-bg p-3 text-[#1a0d07]">
          <p className="text-xs font-bold leading-snug">{t("site.preview.cardQuestion")}</p>
        </div>
        <p className="mt-2 text-xs font-medium">“{t("site.preview.cardAnswer")}”</p>
        <div className="mt-2 flex items-center gap-3 text-muted"><Heart className="size-3.5" /><Share2 className="size-3.5" /></div>
      </div>
    </div>
  );
}
