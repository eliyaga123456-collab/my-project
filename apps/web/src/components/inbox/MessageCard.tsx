"use client";

import { useEffect, useRef } from "react";
import { Archive, Ban, Flag, Inbox, MoreHorizontal, Reply, Share2, ShieldAlert, Trash2, Undo2 } from "lucide-react";
import type { MessageDto } from "@unsaid/shared";
import { Badge, Button, Dropdown, cx, type MenuItem } from "@/components/ui";
import { timeAgo } from "@/lib/format";

export type MessageAction = "reply" | "share" | "delete" | "report" | "block" | "archive" | "unarchive" | "remove-reply";

const categoryLabel: Record<string, string> = {
  harassment: "harassment", threat: "threat", hate: "hate", sexual: "sexual content",
  self_harm: "self-harm", personal_info: "personal info", dangerous: "dangerous", spam: "spam"
};

export function MessageCard({
  message, onAction, onSeen
}: { message: MessageDto; onAction: (a: MessageAction, m: MessageDto) => void; onSeen: (m: MessageDto) => void }) {
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
    { id: "share", label: "Share", icon: <Share2 className="size-4" />, onSelect: () => onAction("share", message) },
    message.status === "archived"
      ? { id: "unarchive", label: "Move to inbox", icon: <Undo2 className="size-4" />, onSelect: () => onAction("unarchive", message) }
      : { id: "archive", label: "Archive", icon: <Archive className="size-4" />, onSelect: () => onAction("archive", message) },
    ...(answered ? [{ id: "remove-reply", label: "Remove reply", icon: <Undo2 className="size-4" />, onSelect: () => onAction("remove-reply", message) }] : []),
    { id: "report", label: "Report", icon: <Flag className="size-4" />, onSelect: () => onAction("report", message) },
    { id: "block", label: "Block sender", icon: <Ban className="size-4" />, danger: true, onSelect: () => onAction("block", message) },
    { id: "delete", label: "Delete", icon: <Trash2 className="size-4" />, danger: true, onSelect: () => onAction("delete", message) }
  ];

  return (
    <article ref={ref} aria-label={`Anonymous message ${timeAgo(message.createdAt)}`} data-testid="message-card" className={cx("veil animate-ink-in p-5 sm:p-6", !message.read && "veil-unread")}>
      <div className="relative flex flex-wrap items-center gap-2 text-xs">
        {!message.read && <Badge tone="ember"><span className="size-1.5 rounded-full bg-primary" aria-hidden />New</Badge>}
        <span className="font-semibold uppercase tracking-wider text-muted">Anonymous</span>
        <span className="text-muted" aria-hidden>·</span>
        <time dateTime={message.createdAt} className="text-muted">{timeAgo(message.createdAt)}</time>
        {message.linkLabel && <Badge tone="mist">{message.linkLabel}</Badge>}
        {message.status === "filtered" && message.filteredCategories.map((c) => <Badge key={c} tone="warning">{categoryLabel[c] ?? c}</Badge>)}
      </div>

      <p className="relative mt-3 whitespace-pre-wrap text-[1.08rem] leading-relaxed [overflow-wrap:anywhere]">{message.body}</p>

      {message.status === "filtered" && message.filteredCategories.includes("self_harm") && (
        <p className="mt-3 flex gap-2 rounded-md bg-secondary/10 p-3 text-sm"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden />
          <span>This message mentions self-harm. If you&apos;re struggling, you&apos;re not alone. Talking to someone you trust or a local helpline (988 in the US, or findahelpline.com) can help.</span></p>
      )}

      {message.reply && (
        <div className="mt-4 rounded-md border-l-2 border-primary bg-raised/60 p-3.5">
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted">
            <Reply className="size-3.5" aria-hidden /> Your reply <Badge tone={message.reply.public ? "success" : "neutral"}>{message.reply.public ? "Public" : "Private"}</Badge>
          </p>
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.reply.text}</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {!answered && <Button size="sm" onClick={() => onAction("reply", message)} leading={<Reply className="size-4" aria-hidden />}>Reply</Button>}
        {message.status === "filtered" && (
          <Button size="sm" variant="secondary" onClick={() => onAction("unarchive", message)} leading={<Inbox className="size-4" aria-hidden />}>Looks fine</Button>
        )}
        {answered && <Button size="sm" variant="secondary" onClick={() => onAction("share", message)} leading={<Share2 className="size-4" aria-hidden />}>Share</Button>}
        <div className="ml-auto">
          <Dropdown label="More actions" trigger={<MoreHorizontal className="size-5" aria-hidden />} items={menu} />
        </div>
      </div>
    </article>
  );
}
