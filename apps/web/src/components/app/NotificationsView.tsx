"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, MessageCircle, ShieldAlert, Sparkles } from "lucide-react";
import type { NotificationDto } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/format";
import { Button, EmptyState, ErrorState, ListSkeleton, cx, useToast } from "@/components/ui";
import { useMe } from "./MeProvider";

const icons = { new_message: MessageCircle, message_activity: Sparkles, safety: ShieldAlert } as const;

export function NotificationsView() {
  const toast = useToast();
  const router = useRouter();
  const { refresh } = useMe();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const p = await api.notifications.list({ limit: 20 });
      setItems(p.items);
      setCursor(p.nextCursor);
      setState("ready");
    } catch (e) { setError(errorMessage(e)); setState("error"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function loadMore() {
    if (!cursor) return;
    setMore(true);
    try {
      const p = await api.notifications.list({ cursor, limit: 20 });
      setItems((l) => [...l, ...p.items]);
      setCursor(p.nextCursor);
    } catch (e) { toast.error(errorMessage(e)); } finally { setMore(false); }
  }

  async function markAll() {
    setBusy(true);
    const prev = items;
    setItems((l) => l.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    try { await api.notifications.markRead({ all: true }); void refresh(); } catch (e) { setItems(prev); toast.error(errorMessage(e)); } finally { setBusy(false); }
  }

  async function open(n: NotificationDto) {
    if (!n.readAt) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      api.notifications.markRead({ ids: [n.id] }).then(() => refresh(), () => undefined);
    }
    if (n.type === "new_message" || n.type === "message_activity") router.push("/inbox");
  }

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="secondary" size="sm" disabled={unread === 0} loading={busy} onClick={markAll} leading={<CheckCheck className="size-4" aria-hidden />}>Mark all as read</Button>
      </div>
      {state === "loading" && <ListSkeleton rows={4} label="Loading notifications" />}
      {state === "error" && <ErrorState message={error} onRetry={load} />}
      {state === "ready" && items.length === 0 && <EmptyState icon={<Bell className="size-6" aria-hidden />} title="You're all caught up" description="New messages and safety updates will show up here." />}
      {state === "ready" && items.length > 0 && (
        <ul className="stagger space-y-2">
          {items.map((n) => {
            const Icon = icons[n.type] ?? Bell;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={cx("flex w-full items-start gap-4 rounded-lg border p-4 text-left transition hover:bg-raised", n.readAt ? "border-line" : "veil-unread border-primary/50 bg-surface")}
                >
                  <span className={cx("grid size-10 shrink-0 place-items-center rounded-full", n.type === "safety" ? "bg-warning/15 text-warning" : "bg-secondary/15 text-secondary")}><Icon className="size-5" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{n.title}{!n.readAt && <span className="sr-only"> (unread)</span>}</span>
                      <time dateTime={n.createdAt} className="shrink-0 text-xs text-muted">{timeAgo(n.createdAt)}</time>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted [overflow-wrap:anywhere]">{n.body}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {state === "ready" && cursor && <div className="mt-5 text-center"><Button variant="secondary" loading={more} onClick={loadMore}>Load more</Button></div>}
    </div>
  );
}
