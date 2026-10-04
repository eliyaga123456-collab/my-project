"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Clock, Eye, Inbox, Lock, MessageSquare, PauseCircle, Pencil, Plus, Sparkles, Trash2, Unlock } from "lucide-react";
import { LIMITS, type LinkDto } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { compactNumber } from "@/lib/format";
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, IconButton, InputField, Modal, Skeleton, Switch, TextareaField, Tooltip, useToast } from "@/components/ui";
import { ShareActions } from "@/components/public/ShareActions";

const DURATIONS = [
  { id: "none", label: "No end", hours: 0 },
  { id: "1h", label: "1 hour", hours: 1 },
  { id: "24h", label: "24 hours", hours: 24 },
  { id: "3d", label: "3 days", hours: 72 },
  { id: "7d", label: "7 days", hours: 168 }
] as const;

const closesIso = (hours: number) => (hours ? new Date(Date.now() + hours * 3_600_000).toISOString() : null);
const when = (iso: string) => new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }).format(new Date(iso));

function Stats({ link }: { link: LinkDto }) {
  return (
    <p className="flex items-center gap-4 text-sm text-muted">
      <span className="inline-flex items-center gap-1.5"><Eye className="size-4" aria-hidden />{compactNumber(link.views)} <span className="sr-only">views</span><span aria-hidden>views</span></span>
      <span className="inline-flex items-center gap-1.5"><MessageSquare className="size-4" aria-hidden />{compactNumber(link.messages)} <span className="sr-only">messages</span><span aria-hidden>messages</span></span>
    </p>
  );
}

export function LinksView() {
  const toast = useToast();
  const [links, setLinks] = useState<LinkDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]["id"]>("none");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LinkDto | null>(null);
  const [deleting, setDeleting] = useState<LinkDto | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setLinks((await api.links.list()).items); } catch (e) { setError(errorMessage(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const replace = (l: LinkDto) => setLinks((cur) => cur?.map((x) => (x.id === l.id ? l : x)) ?? cur);

  async function togglePause(l: LinkDto, paused: boolean) {
    replace({ ...l, paused });
    try {
      const updated = l.isPrimary ? await api.links.pause(paused) : await api.links.update(l.id, { paused });
      replace(updated);
      toast.success(paused ? "Paused. Nobody can send messages." : "Live again");
    } catch (e) { replace(l); toast.error(errorMessage(e)); }
  }

  async function startRound(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const q = question.trim();
    if (!t) { setCreateError("Name your round, like “Friday dinner ideas”"); return; }
    setCreateError(null);
    setCreating(true);
    try {
      const hours = DURATIONS.find((d) => d.id === duration)?.hours ?? 0;
      const l = await api.links.create({ label: t, ...(q ? { prompt: q } : {}), closesAt: closesIso(hours) });
      setLinks((cur) => [...(cur ?? []), l]);
      setTitle(""); setQuestion(""); setDuration("none");
      toast.success("Round started. Share its link!");
    } catch (err) { setCreateError(errorMessage(err)); } finally { setCreating(false); }
  }

  async function closeNow(l: LinkDto) {
    try { replace(await api.links.update(l.id, { paused: true })); toast.success("Round paused"); } catch (e) { toast.error(errorMessage(e)); }
  }
  async function reopen(l: LinkDto, hours: number) {
    try { replace(await api.links.update(l.id, { paused: false, closesAt: closesIso(hours) })); toast.success(hours ? `Round reopened for ${hours >= 24 ? `${hours / 24} day(s)` : `${hours} hour(s)`}` : "Round reopened"); } catch (e) { toast.error(errorMessage(e)); }
  }

  async function remove(l: LinkDto) {
    setDeleting(null);
    const prev = links;
    setLinks((cur) => cur?.filter((x) => x.id !== l.id) ?? cur);
    try { await api.links.remove(l.id); toast.success("Round deleted. Its link no longer works."); } catch (e) { setLinks(prev); toast.error(errorMessage(e)); }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!links) return <div role="status" className="space-y-4"><span className="sr-only">Loading…</span><Skeleton className="h-56 w-full rounded-lg" /><Skeleton className="h-32 w-full rounded-lg" /></div>;

  const primary = links.find((l) => l.isPrimary);
  const rounds = links.filter((l) => !l.isPrimary).sort((a, b) => Number(a.closed) - Number(b.closed) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-12">
      <section aria-labelledby="new-round" className="veil grain p-5 sm:p-7">
        <div className="relative">
          <h2 id="new-round" className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><Sparkles className="size-5 text-primary" aria-hidden />Start a new anonymous round</h2>
          <p className="mt-1 text-muted">Ask something specific, get a fresh link, send it to people. Everyone who opens it can write to you anonymously, and you can follow each round on its own.</p>
          <form onSubmit={startRound} noValidate className="mt-5 space-y-3">
            <InputField label="Round name" placeholder="e.g. Friday dinner ideas" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.linkLabelMax} error={createError} />
            <TextareaField label="Your question (optional)" hint="Shown to everyone who opens this round's link. Leave empty to use your profile prompt." placeholder="What should I cook on Friday? 🍳" rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={LIMITS.roundPromptMax} counter={<span>{question.length}/{LIMITS.roundPromptMax}</span>} />
            <fieldset>
              <legend className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Clock className="size-4" aria-hidden />Close it automatically after</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Round duration">
                {DURATIONS.map((d) => (
                  <button key={d.id} type="button" role="radio" aria-checked={duration === d.id} onClick={() => setDuration(d.id)}
                    className={"min-h-11 rounded-full border px-4 text-sm font-semibold transition " + (duration === d.id ? "border-transparent bg-primary text-on-primary" : "border-line text-muted hover:bg-raised")}>
                    {d.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <Button type="submit" size="lg" loading={creating} leading={<Plus className="size-4" aria-hidden />}>Create round &amp; get link</Button>
          </form>
        </div>
      </section>

      <section aria-labelledby="rounds">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="rounds" className="text-xl font-bold">Your rounds</h2>
          <span className="text-sm text-muted">{rounds.length}/{LIMITS.linksPerUser - 1}</span>
        </div>
        {rounds.length === 0 ? (
          <EmptyState title="No rounds yet" description="Start one above. Each round gets its own link, question and inbox view." />
        ) : (
          <ul className="space-y-3">
            {rounds.map((l) => (
              <li key={l.id} className="veil animate-ink-in p-4 sm:p-5">
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold [overflow-wrap:anywhere]">
                      {l.label}
                      {l.closed ? <Badge tone="neutral"><Lock className="size-3" aria-hidden />Closed</Badge> : l.paused ? <Badge tone="warning"><PauseCircle className="size-3" aria-hidden />Paused</Badge> : <Badge tone="success">Open</Badge>}
                    </p>
                    {l.prompt && <p className="mt-1 text-[0.95rem] [overflow-wrap:anywhere]">&ldquo;{l.prompt}&rdquo;</p>}
                    <p className="mt-1 break-all font-mono text-xs text-muted">{l.url}</p>
                    {l.closesAt && <p className="mt-1 text-xs text-muted">{l.closed ? "Closed" : "Closes"} {when(l.closesAt)}</p>}
                  </div>
                  <div className="flex items-center">
                    <Tooltip label="Edit"><IconButton label={`Edit ${l.label}`} onClick={() => setEditing(l)}><Pencil className="size-4" aria-hidden /></IconButton></Tooltip>
                    <Tooltip label="Delete"><IconButton label={`Delete ${l.label}`} onClick={() => setDeleting(l)} className="hover:text-danger"><Trash2 className="size-4" aria-hidden /></IconButton></Tooltip>
                  </div>
                </div>
                {!l.closed && <div className="relative mt-3"><ShareActions path={l.url} text={l.prompt ? `${l.prompt} — answer anonymously on EAR` : "Send me an anonymous message on EAR"} /></div>}
                <div className="relative mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <Stats link={l} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/inbox?round=${l.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold hover:bg-raised"><Inbox className="size-4" aria-hidden />See responses</Link>
                    {l.closed ? (
                      <Button size="sm" variant="secondary" onClick={() => reopen(l, 24)} leading={<Unlock className="size-4" aria-hidden />}>Reopen 24h</Button>
                    ) : l.paused ? (
                      <Button size="sm" variant="secondary" onClick={() => togglePause(l, false)}>Resume</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => closeNow(l)}>Pause</Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {primary && (
        <section aria-labelledby="primary" className="veil p-5 sm:p-7">
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2"><h2 id="primary" className="text-xl font-bold">Your always-on link</h2>{primary.paused && <Badge tone="warning"><PauseCircle className="size-3" aria-hidden />Paused</Badge>}</div>
            <p className="mt-1 text-muted">Your main profile link, great for your bio. Rounds above are for one-off questions.</p>
            <p data-testid="primary-link" className="mt-3 break-all rounded-md bg-raised px-4 py-3 font-mono text-sm sm:text-base">{primary.url}</p>
            <div className="mt-4"><ShareActions path={primary.url} text="Send me an anonymous message on EAR" /></div>
            <div className="mt-4 border-t border-line pt-2"><Stats link={primary} /></div>
            <Switch checked={!primary.paused} onChange={(on) => togglePause(primary, !on)} label="Accepting messages" description="Turn off to pause this link. Visitors see a friendly paused message and nothing is stored." />
          </div>
        </section>
      )}

      <EditDialog link={editing} onClose={() => setEditing(null)} onSaved={replace} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove(deleting)} danger title="Delete this round?" confirmLabel="Delete round" description={deleting ? `“${deleting.label}” stops working immediately. Messages you already received stay in your inbox.` : undefined} />
    </div>
  );
}

function EditDialog({ link, onClose, onSaved }: { link: LinkDto | null; onClose: () => void; onSaved: (l: LinkDto) => void }) {
  const toast = useToast();
  const [label, setLabel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [extend, setExtend] = useState<"keep" | "none" | "1h" | "24h" | "3d" | "7d">("keep");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (link) { setLabel(link.label); setPrompt(link.prompt ?? ""); setExtend("keep"); setError(null); setBusy(false); } }, [link]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!link) return;
    const l = label.trim();
    if (!l) { setError("Name can't be empty"); return; }
    setBusy(true);
    try {
      const closes = extend === "keep" ? undefined : closesIso(DURATIONS.find((d) => d.id === extend)?.hours ?? 0);
      const updated = await api.links.update(link.id, { label: l, prompt: prompt.trim() || null, ...(closes === undefined ? {} : { closesAt: closes, paused: false }) });
      onSaved(updated); toast.success("Round updated"); onClose();
    } catch (err) { setError(errorMessage(err)); setBusy(false); }
  }
  return (
    <Modal open={!!link} onClose={onClose} title="Edit round" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="edit-round" loading={busy}>Save</Button></>}>
      <form id="edit-round" onSubmit={submit} noValidate className="space-y-3">
        <InputField label="Round name" data-autofocus value={label} onChange={(e) => setLabel(e.target.value)} maxLength={LIMITS.linkLabelMax} error={error} />
        <TextareaField label="Question" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={LIMITS.roundPromptMax} counter={<span>{prompt.length}/{LIMITS.roundPromptMax}</span>} />
        <div>
          <label htmlFor="extend" className="mb-1.5 block text-sm font-semibold">Closing time</label>
          <select id="extend" value={extend} onChange={(e) => setExtend(e.target.value as typeof extend)} className="min-h-12 w-full rounded-md border border-line bg-surface px-3">
            <option value="keep">Keep as is{link?.closesAt ? ` (${when(link.closesAt)})` : " (no end)"}</option>
            <option value="none">Never close</option>
            {DURATIONS.slice(1).map((d) => <option key={d.id} value={d.id}>Close in {d.label}</option>)}
          </select>
        </div>
      </form>
    </Modal>
  );
}
