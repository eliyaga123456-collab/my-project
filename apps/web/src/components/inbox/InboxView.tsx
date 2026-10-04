"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy } from "lucide-react";
import type { LinkDto, MessageDto, MessageStatus } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { Button, EmptyState, ErrorState, ListSkeleton, Tabs, useToast } from "@/components/ui";
import { useMe } from "@/components/app/MeProvider";
import { MessageCard, type MessageAction } from "./MessageCard";
import { BlockDialog, DeleteDialog, ReplyDialog, ReportDialog, ShareDialog } from "./Dialogs";

type Dialog = { type: "reply" | "report" | "delete" | "block" | "share"; msg: MessageDto } | null;

const emptyCopy: Record<MessageStatus, { title: string; description: string }> = {
  inbox: { title: "No messages yet", description: "Share your link and see what people have to say." },
  filtered: { title: "Nothing filtered", description: "Messages our filters hold back for a second look will appear here. Nothing there is bad news." },
  archived: { title: "Archive is empty", description: "Messages you archive or block land here." }
};

export function InboxView({ shareUrlPath }: { shareUrlPath: string }) {
  const toast = useToast();
  const { refresh } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [round, setRound] = useState(params.get("round") ?? "");
  const [rounds, setRounds] = useState<LinkDto[]>([]);
  const [tab, setTab] = useState<MessageStatus>("inbox");
  const [items, setItems] = useState<MessageDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const seq = useRef(0);

  const load = useCallback(async (status: MessageStatus, linkId: string) => {
    const id = ++seq.current;
    setState("loading");
    try {
      const page = await api.messages.list({ status, limit: 20, ...(linkId ? { linkId } : {}) });
      if (id !== seq.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setState("ready");
    } catch (e) {
      if (id !== seq.current) return;
      setError(errorMessage(e));
      setState("error");
    }
  }, []);

  useEffect(() => { void load(tab, round); }, [tab, round, load]);
  useEffect(() => { api.links.list().then((r) => setRounds(r.items.filter((l) => !l.isPrimary)), () => undefined); }, []);
  function pickRound(id: string) {
    setRound(id);
    router.replace(id ? `${pathname}?round=${id}` : pathname, { scroll: false });
  }

  async function loadMore() {
    if (!cursor) return;
    setMore(true);
    try {
      const page = await api.messages.list({ status: tab, cursor, limit: 20, ...(round ? { linkId: round } : {}) });
      setItems((l) => [...l, ...page.items.filter((n) => !l.some((o) => o.id === n.id))]);
      setCursor(page.nextCursor);
    } catch (e) { toast.error(errorMessage(e)); } finally { setMore(false); }
  }

  const patch = (m: MessageDto) => setItems((l) => l.map((x) => (x.id === m.id ? m : x)));
  const remove = (id: string) => setItems((l) => l.filter((x) => x.id !== id));
  /** Optimistic removal with rollback of position. */
  function optimisticRemove(m: MessageDto) {
    const index = items.findIndex((x) => x.id === m.id);
    remove(m.id);
    return () => setItems((l) => { const c = l.slice(); c.splice(Math.min(index, c.length), 0, m); return c; });
  }

  const onSeen = useCallback((m: MessageDto) => {
    setItems((l) => l.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
    api.messages.update(m.id, { read: true }).then(() => refresh(), () => setItems((l) => l.map((x) => (x.id === m.id ? { ...x, read: false } : x))));
  }, [refresh]);

  async function move(m: MessageDto, status: "inbox" | "archived") {
    const undo = optimisticRemove(m);
    try {
      await api.messages.update(m.id, { status });
      toast.success(status === "archived" ? "Archived" : "Moved to inbox");
      void refresh();
    } catch (e) { undo(); toast.error(errorMessage(e)); }
  }

  function onAction(a: MessageAction, m: MessageDto) {
    switch (a) {
      case "reply": case "report": case "delete": case "block": case "share": setDialog({ type: a, msg: m }); break;
      case "archive": void move(m, "archived"); break;
      case "unarchive": void move(m, "inbox"); break;
      case "remove-reply":
        api.messages.removeReply(m.id).then((u) => { patch(u); toast.success("Reply removed"); }, (e) => toast.error(errorMessage(e)));
        break;
    }
  }

  const close = () => setDialog(null);
  const target = dialog?.msg ?? null;

  async function doReply(text: string, isPublic: boolean) {
    if (!target) return;
    try {
      const updated = await api.messages.reply(target.id, text, isPublic);
      patch(updated);
      close();
      toast.success(isPublic ? "Reply posted" : "Reply saved");
      if (isPublic && updated.reply?.answerId) setDialog({ type: "share", msg: updated });
    } catch (e) { toast.error(errorMessage(e)); throw e; }
  }
  async function doReport(reason: string, details?: string) {
    if (!target) return;
    try { await api.messages.report(target.id, reason, details); close(); toast.success("Report sent. Thank you for keeping EAR kind."); } catch (e) { toast.error(errorMessage(e)); throw e; }
  }
  async function doDelete() {
    if (!target) return;
    const m = target;
    close();
    const undo = optimisticRemove(m);
    try { await api.messages.remove(m.id); toast.success("Message deleted"); void refresh(); } catch (e) { undo(); toast.error(errorMessage(e)); }
  }
  async function doBlock() {
    if (!target) return;
    const m = target;
    close();
    const undo = optimisticRemove(m);
    try { await api.messages.block(m.id); toast.success("Sender blocked and message archived"); void refresh(); } catch (e) { undo(); toast.error(errorMessage(e)); }
  }

  return (
    <div>
      <div className="mb-6">
        {rounds.length > 0 && (
          <div className="mb-4" role="group" aria-label="Filter by round">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {[{ id: "", label: "All messages" }, { id: "__main", label: "" }, ...rounds.map((r) => ({ id: r.id, label: r.label }))].filter((r) => r.id !== "__main").map((r) => (
                <button key={r.id || "all"} type="button" aria-pressed={round === r.id} onClick={() => pickRound(r.id)}
                  className={"min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition " + (round === r.id ? "border-transparent bg-primary text-on-primary" : "border-line text-muted hover:bg-raised")}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <Tabs
          label="Message folders"
          idPrefix="inbox-tab"
          value={tab}
          onChange={(id) => setTab(id as MessageStatus)}
          tabs={[{ id: "inbox", label: "Inbox" }, { id: "filtered", label: "Filtered" }, { id: "archived", label: "Archived" }]}
        />
        {tab === "filtered" && <p className="mt-3 text-sm text-muted">Held back by our filters. Review them if you like. Most you can safely ignore.</p>}
      </div>

      <div role="tabpanel" id="inbox-tab-panel" aria-labelledby={`inbox-tab-${tab}`} aria-live="polite">
        {state === "loading" && <ListSkeleton rows={3} label="Loading messages" />}
        {state === "error" && <ErrorState message={error} onRetry={() => load(tab, round)} />}
        {state === "ready" && items.length === 0 && (
          <EmptyState
            {...emptyCopy[tab]}
            action={tab === "inbox" ? <ShareLinkButton path={shareUrlPath} /> : undefined}
          />
        )}
        {state === "ready" && items.length > 0 && (
          <div className="space-y-4">
            {items.map((m) => <MessageCard key={m.id} message={m} onAction={onAction} onSeen={onSeen} />)}
            {cursor && <div className="pt-2 text-center"><Button variant="secondary" loading={more} onClick={loadMore}>Load more</Button></div>}
          </div>
        )}
      </div>

      <ReplyDialog message={dialog?.type === "reply" ? target : null} onClose={close} onSubmit={doReply} />
      <ReportDialog message={dialog?.type === "report" ? target : null} onClose={close} onSubmit={doReport} />
      <DeleteDialog message={dialog?.type === "delete" ? target : null} onClose={close} onConfirm={doDelete} />
      <BlockDialog message={dialog?.type === "block" ? target : null} onClose={close} onConfirm={doBlock} />
      <ShareDialog message={dialog?.type === "share" ? target : null} onClose={close} onReply={(m) => setDialog({ type: "reply", msg: m })} />
    </div>
  );
}

function ShareLinkButton({ path }: { path: string }) {
  const toast = useToast();
  return (
    <div className="flex flex-col items-center gap-2 xs:flex-row">
      <Button
        leading={<Copy className="size-4" aria-hidden />}
        onClick={async () => {
          try { await navigator.clipboard.writeText(new URL(path, window.location.origin).toString()); toast.success("Link copied"); } catch { toast.error("Couldn't copy the link"); }
        }}
      >Copy my link</Button>
      <Link href="/links" className="text-sm font-semibold text-secondary underline-offset-4 hover:underline">More ways to share</Link>
    </div>
  );
}
