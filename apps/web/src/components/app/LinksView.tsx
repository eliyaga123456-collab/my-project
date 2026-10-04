"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Eye, MessageSquare, PauseCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { LIMITS, type LinkDto } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { compactNumber } from "@/lib/format";
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, IconButton, InputField, Modal, Skeleton, Switch, Tooltip, useToast } from "@/components/ui";
import { ShareActions } from "@/components/public/ShareActions";

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
  const [label, setLabel] = useState("");
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
      toast.success(paused ? "Link paused. Nobody can send messages." : "Link is live again");
    } catch (e) { replace(l); toast.error(errorMessage(e)); }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    const v = label.trim();
    if (!v) { setCreateError("Give the link a name, like “Instagram bio”"); return; }
    setCreateError(null);
    setCreating(true);
    try {
      const l = await api.links.create(v);
      setLinks((cur) => [...(cur ?? []), l]);
      setLabel("");
      toast.success("Link created");
    } catch (err) { setCreateError(errorMessage(err)); } finally { setCreating(false); }
  }

  async function saveLabel(l: LinkDto, next: string) {
    const updated = await api.links.update(l.id, { label: next });
    replace(updated);
    toast.success("Label updated");
  }

  async function remove(l: LinkDto) {
    setDeleting(null);
    const prev = links;
    setLinks((cur) => cur?.filter((x) => x.id !== l.id) ?? cur);
    try { await api.links.remove(l.id); toast.success("Link deleted. It no longer works."); } catch (e) { setLinks(prev); toast.error(errorMessage(e)); }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!links) return <div role="status" className="space-y-4"><span className="sr-only">Loading links…</span><Skeleton className="h-56 w-full rounded-lg" /><Skeleton className="h-32 w-full rounded-lg" /></div>;

  const primary = links.find((l) => l.isPrimary);
  const extras = links.filter((l) => !l.isPrimary);

  return (
    <div className="space-y-10">
      {primary && (
        <section aria-labelledby="primary" className="veil grain p-5 sm:p-7">
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2"><h2 id="primary" className="text-xl font-bold">Your personal link</h2>{primary.paused && <Badge tone="warning"><PauseCircle className="size-3" aria-hidden />Paused</Badge>}</div>
            <p data-testid="primary-link" className="mt-3 break-all rounded-md bg-raised px-4 py-3 font-mono text-sm sm:text-base">{primary.url}</p>
            <div className="mt-4"><ShareActions path={primary.url} text="Send me an anonymous message on Unsaid" /></div>
            <div className="mt-4 border-t border-line pt-2"><Stats link={primary} /></div>
            <Switch checked={!primary.paused} onChange={(on) => togglePause(primary, !on)} label="Accepting messages" description="Turn off to pause this link. Visitors see a friendly paused message and nothing is stored." />
          </div>
        </section>
      )}

      <section aria-labelledby="extra">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 id="extra" className="text-xl font-bold">Extra links</h2>
          <span className="text-sm text-muted">{extras.length}/{LIMITS.linksPerUser - 1}</span>
        </div>
        <p className="mb-4 text-muted">Make a link per place you share it (bio, story, group chat) and see which one gets the most love.</p>

        <form onSubmit={create} noValidate className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start">
          <InputField className="flex-1" label="New link label" hideLabel placeholder="e.g. Instagram bio" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={LIMITS.linkLabelMax} error={createError} />
          <Button type="submit" loading={creating} leading={<Plus className="size-4" aria-hidden />} className="h-12">Create link</Button>
        </form>

        {extras.length === 0 ? (
          <EmptyState title="No extra links yet" description="Create one above to track where your messages come from." />
        ) : (
          <ul className="space-y-3">
            {extras.map((l) => (
              <li key={l.id} className="veil animate-ink-in p-4 sm:p-5">
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold [overflow-wrap:anywhere]">{l.label}{l.paused && <Badge tone="warning">Paused</Badge>}</p>
                    <p className="mt-1 break-all font-mono text-xs text-muted">{l.url}</p>
                  </div>
                  <div className="flex items-center">
                    <Tooltip label="Rename"><IconButton label={`Rename ${l.label}`} onClick={() => setEditing(l)}><Pencil className="size-4" aria-hidden /></IconButton></Tooltip>
                    <Tooltip label="Delete"><IconButton label={`Delete ${l.label}`} onClick={() => setDeleting(l)} className="hover:text-danger"><Trash2 className="size-4" aria-hidden /></IconButton></Tooltip>
                  </div>
                </div>
                <div className="relative mt-3"><ShareActions path={l.url} text="Send me an anonymous message on Unsaid" compact /></div>
                <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                  <Stats link={l} />
                  <div className="w-44"><Switch checked={!l.paused} onChange={(on) => togglePause(l, !on)} label="Active" /></div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RenameDialog link={editing} onClose={() => setEditing(null)} onSave={saveLabel} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove(deleting)} danger title="Delete this link?" confirmLabel="Delete link" description={deleting ? `“${deleting.label}” will stop working immediately. Messages already received stay in your inbox.` : undefined} />
    </div>
  );
}

function RenameDialog({ link, onClose, onSave }: { link: LinkDto | null; onClose: () => void; onSave: (l: LinkDto, label: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (link) { setValue(link.label); setError(null); setBusy(false); } }, [link]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!link) return;
    const v = value.trim();
    if (!v) { setError("Label can't be empty"); return; }
    setBusy(true);
    try { await onSave(link, v); onClose(); } catch (err) { setError(errorMessage(err)); setBusy(false); }
  }
  return (
    <Modal open={!!link} onClose={onClose} title="Rename link" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="rename-form" loading={busy}>Save</Button></>}>
      <form id="rename-form" onSubmit={submit} noValidate>
        <InputField label="Label" data-autofocus value={value} onChange={(e) => setValue(e.target.value)} maxLength={LIMITS.linkLabelMax} error={error} />
      </form>
    </Modal>
  );
}
