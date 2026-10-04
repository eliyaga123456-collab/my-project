"use client";

import { useEffect, useRef } from "react";
import { Archive, Ban, Flag, Inbox, MoreHorizontal, Reply, Share2, ShieldAlert, Trash2, Undo2 } from "lucide-react";
import type { MessageDto } from "@unsaid/shared";
import { Badge, Button, Dropdown, cx, type MenuItem } from "@/components/ui";
import { useT } from "@/i18n/client";
import type { Key } from "@/i18n/translate";
import { timeAgoT } from "@/lib/format";

export type MessageAction = "reply" | "share" | "delete" | "report" | "block" | "archive" | "unarchive" | "remove-reply";

const CATEGORIES = ["harassment", "threat", "hate", "sexual", "self_harm", "personal_info", "dangerous", "spam", "hidden_word"];
const categoryKey = (c: string): Key | null => (CATEGORIES.includes(c) ? (`app.message.cat.${c}` as Key) : null);

export function MessageCard({
  message, onAction, onSeen
}: { message: MessageDto; onAction: (a: MessageAction, m: MessageDto) => void; onSeen: (m: MessageDto) => void }) {
  const tr = useT();
  const { t } = tr;
  const ago = timeAgoT(message.createdAt, tr);
  const ref = useRef<HTMLElement>(null);
  const answered = !!message.reply;

  useEffect(() => {
    if (message.read || typeof IntersectionObserver === "undefined") return;
    const el = ref.current;
    if (!el) return;
    let timer: number | undefined;
    const io = new IntersectionObserver(([entry]) => {
      window.clearTimeout(timer);
      if (entry?.isIntersecting) timer = window.setTimeout(() => onSeen(message), 1800);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(timer); };
  }, [message, onSeen]);

  const menu: MenuItem[] = [
    { id: "share", label: t("app.message.share"), icon: <Share2 className="size-4" />, onSelect: () => onAction("share", message) },
    message.status === "archived"
      ? { id: "unarchive", label: t("app.message.moveToInbox"), icon: <Undo2 className="size-4 rtl:-scale-x-100" />, onSelect: () => onAction("unarchive", message) }
      : { id: "archive", label: t("app.message.archive"), icon: <Archive className="size-4" />, onSelect: () => onAction("archive", message) },
    ...(answered ? [{ id: "remove-reply", label: t("app.message.removeReply"), icon: <Undo2 className="size-4 rtl:-scale-x-100" />, onSelect: () => onAction("remove-reply", message) }] : []),
    { id: "report", label: t("app.message.report"), icon: <Flag className="size-4" />, onSelect: () => onAction("report", message) },
    { id: "block", label: t("app.message.blockSender"), icon: <Ban className="size-4" />, danger: true, onSelect: () => onAction("block", message) },
    { id: "delete", label: t("app.message.delete"), icon: <Trash2 className="size-4" />, danger: true, onSelect: () => onAction("delete", message) }
  ];

  return (
    <article ref={ref} aria-label={t("app.message.ariaLabel", { time: ago })} data-testid="message-card" className={cx("veil animate-ink-in p-5 sm:p-6", !message.read && "veil-unread")}>
      <div className="relative flex flex-wrap items-center gap-2 text-xs">
        {!message.read && <Badge tone="ember"><span className="size-1.5 rounded-full bg-primary" aria-hidden />{t("app.message.new")}</Badge>}
        <span className="font-semibold uppercase tracking-wider text-muted">{t("app.message.anonymous")}</span>
        <span className="text-muted" aria-hidden>·</span>
        <time dateTime={message.createdAt} className="text-muted">{ago}</time>
        {message.linkLabel && <Badge tone="mist"><span dir="auto">{message.linkLabel}</span></Badge>}
        {message.status === "filtered" && message.filteredCategories.map((c) => <Badge key={c} tone="warning">{categoryKey(c) ? t(categoryKey(c)!) : c}</Badge>)}
      </div>

      <p dir="auto" className="relative mt-3 whitespace-pre-wrap text-[1.08rem] leading-relaxed [overflow-wrap:anywhere]">{message.body}</p>

      {message.status === "filtered" && message.filteredCategories.includes("self_harm") && (
        <p className="mt-3 flex gap-2 rounded-md bg-secondary/10 p-3 text-sm"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden />
          <span>{t("app.message.selfHarm")}</span></p>
      )}

      {message.reply && (
        <div className="mt-4 rounded-md border-s-2 border-primary bg-raised/60 p-3.5">
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted">
            <Reply className="size-3.5 rtl:-scale-x-100" aria-hidden /> {t("app.message.yourReply")} <Badge tone={message.reply.public ? "success" : "neutral"}>{message.reply.public ? t("app.message.public") : t("app.message.private")}</Badge>
          </p>
          <p dir="auto" className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.reply.text}</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {!answered && <Button size="sm" onClick={() => onAction("reply", message)} leading={<Reply className="size-4 rtl:-scale-x-100" aria-hidden />}>{t("app.message.reply")}</Button>}
        {message.status === "filtered" && (
          <Button size="sm" variant="secondary" onClick={() => onAction("unarchive", message)} leading={<Inbox className="size-4" aria-hidden />}>{t("app.message.looksFine")}</Button>
        )}
        {answered && <Button size="sm" variant="secondary" onClick={() => onAction("share", message)} leading={<Share2 className="size-4" aria-hidden />}>{t("app.message.share")}</Button>}
        <div className="ms-auto">
          <Dropdown label={t("app.message.moreActions")} trigger={<MoreHorizontal className="size-5" aria-hidden />} items={menu} />
        </div>
      </div>
    </article>
  );
}
