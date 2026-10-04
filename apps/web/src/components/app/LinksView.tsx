"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Clock, Eye, Inbox, Lock, MessageSquare, PauseCircle, Pencil, Plus, Sparkles, Trash2, Unlock } from "lucide-react";
import { LIMITS, type LinkDto } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { formatDateTime } from "@/i18n/format";
import type { Key } from "@/i18n/translate";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { compactNumber } from "@/lib/format";
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, IconButton, InputField, Modal, Skeleton, Switch, TextareaField, Tooltip, useToast } from "@/components/ui";
import { ShareActions } from "@/components/public/ShareActions";

const DURATIONS = [
  { id: "none", label: "app.links.dur.none", hours: 0 },
  { id: "1h", label: "app.links.dur.h1", hours: 1 },
  { id: "24h", label: "app.links.dur.h24", hours: 24 },
  { id: "3d", label: "app.links.dur.d3", hours: 72 },
  { id: "7d", label: "app.links.dur.d7", hours: 168 }
] as const satisfies readonly { id: string; label: Key; hours: number }[];

const closesIso = (hours: number) => (hours ? new Date(Date.now() + hours * 3_600_000).toISOString() : null);

function useWhen() {
  const { locale } = useT();
  return (iso: string) => formatDateTime(locale, iso);
}

function Stats({ link }: { link: LinkDto }) {
  const { t } = useT();
  return (
    <p className="flex items-center gap-4 text-sm text-muted">
      <span className="inline-flex items-center gap-1.5"><Eye className="size-4" aria-hidden />{compactNumber(link.views)} <span className="sr-only">{t("app.links.views")}</span><span aria-hidden>{t("app.links.views")}</span></span>
      <span className="inline-flex items-center gap-1.5"><MessageSquare className="size-4" aria-hidden />{compactNumber(link.messages)} <span className="sr-only">{t("app.links.messages")}</span><span aria-hidden>{t("app.links.messages")}</span></span>
    </p>
  );
}

export function LinksView() {
  const { t, tp } = useT();
  const when = useWhen();
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
    try { setLinks((await api.links.list()).items); } catch (e) { setError(errorMessage(e, t("public.errors.generic"))); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  const replace = (l: LinkDto) => setLinks((cur) => cur?.map((x) => (x.id === l.id ? l : x)) ?? cur);

  async function togglePause(l: LinkDto, paused: boolean) {
    replace({ ...l, paused });
    try {
      const updated = l.isPrimary ? await api.links.pause(paused) : await api.links.update(l.id, { paused });
      replace(updated);
      toast.success(paused ? t("app.links.pausedToast") : t("app.links.liveToast"));
    } catch (e) { replace(l); toast.error(errorMessage(e, t("public.errors.generic"))); }
  }

  async function startRound(e: FormEvent) {
    e.preventDefault();
    const name = title.trim();
    const q = question.trim();
    if (!name) { setCreateError(t("app.links.nameRequired")); return; }
    setCreateError(null);
    setCreating(true);
    try {
      const hours = DURATIONS.find((d) => d.id === duration)?.hours ?? 0;
      const l = await api.links.create({ label: name, ...(q ? { prompt: q } : {}), closesAt: closesIso(hours) });
      setLinks((cur) => [...(cur ?? []), l]);
      setTitle(""); setQuestion(""); setDuration("none");
      toast.success(t("app.links.started"));
    } catch (err) { setCreateError(errorMessage(err, t("public.errors.generic"))); } finally { setCreating(false); }
  }

  async function closeNow(l: LinkDto) {
    try { replace(await api.links.update(l.id, { paused: true })); toast.success(t("app.links.roundPaused")); } catch (e) { toast.error(errorMessage(e, t("public.errors.generic"))); }
  }
  async function reopen(l: LinkDto, hours: number) {
    try { replace(await api.links.update(l.id, { paused: false, closesAt: closesIso(hours) })); toast.success(hours ? (hours >= 24 ? tp("app.links.reopenedDays", hours / 24) : tp("app.links.reopenedHours", hours)) : t("app.links.reopened")); } catch (e) { toast.error(errorMessage(e, t("public.errors.generic"))); }
  }

  async function remove(l: LinkDto) {
    setDeleting(null);
    const prev = links;
    setLinks((cur) => cur?.filter((x) => x.id !== l.id) ?? cur);
    try { await api.links.remove(l.id); toast.success(t("app.links.deleted")); } catch (e) { setLinks(prev); toast.error(errorMessage(e, t("public.errors.generic"))); }
  }

  if (error) return <ErrorState title={t("common.state.error")} message={error} retryLabel={t("common.state.retry")} onRetry={load} />;
  if (!links) return <div role="status" className="space-y-4"><span className="sr-only">{t("common.state.loading")}</span><Skeleton className="h-56 w-full rounded-lg" /><Skeleton className="h-32 w-full rounded-lg" /></div>;

  const primary = links.find((l) => l.isPrimary);
  const rounds = links.filter((l) => !l.isPrimary).sort((a, b) => Number(a.closed) - Number(b.closed) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-12">
      <section aria-labelledby="new-round" className="veil grain p-5 sm:p-7">
        <div className="relative">
          <h2 id="new-round" className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><Sparkles className="size-5 text-primary" aria-hidden />{t("app.links.newTitle")}</h2>
          <p className="mt-1 text-muted">{t("app.links.newBody")}</p>
          <form onSubmit={startRound} noValidate className="mt-5 space-y-3">
            <InputField label={t("app.links.nameLabel")} placeholder={t("app.links.namePlaceholder")} dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.linkLabelMax} error={createError} />
            <TextareaField label={t("app.links.questionLabel")} hint={t("app.links.questionHint")} placeholder={t("app.links.questionPlaceholder")} dir="auto" rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={LIMITS.roundPromptMax} counter={<span>{question.length}/{LIMITS.roundPromptMax}</span>} />
            <fieldset>
              <legend className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Clock className="size-4" aria-hidden />{t("app.links.closeAfter")}</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("app.links.durationLabel")}>
                {DURATIONS.map((d) => (
                  <button key={d.id} type="button" role="radio" aria-checked={duration === d.id} onClick={() => setDuration(d.id)}
                    className={"min-h-11 rounded-full border px-4 text-sm font-semibold transition " + (duration === d.id ? "border-transparent bg-primary text-on-primary" : "border-line text-muted hover:bg-raised")}>
                    {t(d.label)}
                  </button>
                ))}
              </div>
            </fieldset>
            <Button type="submit" size="lg" loading={creating} leading={<Plus className="size-4" aria-hidden />}>{t("app.links.create")}</Button>
          </form>
        </div>
      </section>

      <section aria-labelledby="rounds">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="rounds" className="text-xl font-bold">{t("app.links.yourRounds")}</h2>
          <span className="text-sm text-muted">{rounds.length}/{LIMITS.linksPerUser - 1}</span>
        </div>
        {rounds.length === 0 ? (
          <EmptyState title={t("app.links.noneTitle")} description={t("app.links.noneBody")} />
        ) : (
          <ul className="space-y-3">
            {rounds.map((l) => (
              <li key={l.id} className="veil animate-ink-in p-4 sm:p-5">
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold [overflow-wrap:anywhere]">
                      <span dir="auto">{l.label}</span>
                      {l.closed ? <Badge tone="neutral"><Lock className="size-3" aria-hidden />{t("app.links.closed")}</Badge> : l.paused ? <Badge tone="warning"><PauseCircle className="size-3" aria-hidden />{t("app.links.paused")}</Badge> : <Badge tone="success">{t("app.links.open")}</Badge>}
                    </p>
                    {l.prompt && <p dir="auto" className="mt-1 text-[0.95rem] [overflow-wrap:anywhere]">&ldquo;{l.prompt}&rdquo;</p>}
                    <p dir="ltr" className="mt-1 break-all text-start font-mono text-xs text-muted">{l.url}</p>
                    {l.closesAt && <p className="mt-1 text-xs text-muted">{l.closed ? t("app.links.closedAt", { when: when(l.closesAt) }) : t("app.links.closesAt", { when: when(l.closesAt) })}</p>}
                  </div>
                  <div className="flex items-center">
                    <Tooltip label={t("app.links.edit")}><IconButton label={t("app.links.editAria", { label: l.label })} onClick={() => setEditing(l)}><Pencil className="size-4" aria-hidden /></IconButton></Tooltip>
                    <Tooltip label={t("app.links.delete")}><IconButton label={t("app.links.deleteAria", { label: l.label })} onClick={() => setDeleting(l)} className="hover:text-danger"><Trash2 className="size-4" aria-hidden /></IconButton></Tooltip>
                  </div>
                </div>
                {!l.closed && <div className="relative mt-3"><ShareActions path={l.url} text={l.prompt ? t("app.links.shareQuestion", { prompt: l.prompt }) : t("app.links.shareDefault")} /></div>}
                <div className="relative mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <Stats link={l} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/inbox?round=${l.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold hover:bg-raised"><Inbox className="size-4" aria-hidden />{t("app.links.seeResponses")}</Link>
                    {l.closed ? (
                      <Button size="sm" variant="secondary" onClick={() => reopen(l, 24)} leading={<Unlock className="size-4" aria-hidden />}>{t("app.links.reopen24")}</Button>
                    ) : l.paused ? (
                      <Button size="sm" variant="secondary" onClick={() => togglePause(l, false)}>{t("app.links.resume")}</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => closeNow(l)}>{t("app.links.pause")}</Button>
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
            <div className="flex flex-wrap items-center gap-2"><h2 id="primary" className="text-xl font-bold">{t("app.links.primaryTitle")}</h2>{primary.paused && <Badge tone="warning"><PauseCircle className="size-3" aria-hidden />{t("app.links.paused")}</Badge>}</div>
            <p className="mt-1 text-muted">{t("app.links.primaryBody")}</p>
            <p data-testid="primary-link" dir="ltr" className="mt-3 break-all rounded-md text-start bg-raised px-4 py-3 font-mono text-sm sm:text-base">{primary.url}</p>
            <div className="mt-4"><ShareActions path={primary.url} text={t("app.links.shareDefault")} /></div>
            <div className="mt-4 border-t border-line pt-2"><Stats link={primary} /></div>
            <Switch checked={!primary.paused} onChange={(on) => togglePause(primary, !on)} label={t("app.links.accepting")} description={t("app.links.acceptingBody")} />
          </div>
        </section>
      )}

      <EditDialog link={editing} onClose={() => setEditing(null)} onSaved={replace} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove(deleting)} danger title={t("app.links.deleteTitle")} confirmLabel={t("app.links.deleteConfirm")} description={deleting ? t("app.links.deleteBody", { label: deleting.label }) : undefined} />
    </div>
  );
}

function EditDialog({ link, onClose, onSaved }: { link: LinkDto | null; onClose: () => void; onSaved: (l: LinkDto) => void }) {
  const { t } = useT();
  const when = useWhen();
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
    const name = label.trim();
    if (!name) { setError(t("app.links.nameEmpty")); return; }
    setBusy(true);
    try {
      const closes = extend === "keep" ? undefined : closesIso(DURATIONS.find((d) => d.id === extend)?.hours ?? 0);
      const updated = await api.links.update(link.id, { label: name, prompt: prompt.trim() || null, ...(closes === undefined ? {} : { closesAt: closes, paused: false }) });
      onSaved(updated); toast.success(t("app.links.updated")); onClose();
    } catch (err) { setError(errorMessage(err, t("public.errors.generic"))); setBusy(false); }
  }
  return (
    <Modal open={!!link} onClose={onClose} title={t("app.links.editTitle")} footer={<><Button variant="ghost" onClick={onClose}>{t("common.state.cancel")}</Button><Button type="submit" form="edit-round" loading={busy}>{t("common.state.save")}</Button></>}>
      <form id="edit-round" onSubmit={submit} noValidate className="space-y-3">
        <InputField label={t("app.links.nameLabel")} dir="auto" data-autofocus value={label} onChange={(e) => setLabel(e.target.value)} maxLength={LIMITS.linkLabelMax} error={error} />
        <TextareaField label={t("app.links.question")} dir="auto" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={LIMITS.roundPromptMax} counter={<span>{prompt.length}/{LIMITS.roundPromptMax}</span>} />
        <div>
          <label htmlFor="extend" className="mb-1.5 block text-sm font-semibold">{t("app.links.closingTime")}</label>
          <select id="extend" value={extend} onChange={(e) => setExtend(e.target.value as typeof extend)} className="min-h-12 w-full rounded-md border border-line bg-surface px-3">
            <option value="keep">{link?.closesAt ? t("app.links.keepAsIs", { when: when(link.closesAt) }) : t("app.links.keepNoEnd")}</option>
            <option value="none">{t("app.links.neverClose")}</option>
            {DURATIONS.slice(1).map((d) => <option key={d.id} value={d.id}>{t("app.links.closeIn", { duration: t(d.label) })}</option>)}
          </select>
        </div>
      </form>
    </Modal>
  );
}
