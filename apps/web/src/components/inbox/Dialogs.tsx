"use client";

import { useEffect, useState } from "react";
import type { MessageDto } from "@unsaid/shared";
import { LIMITS, REPORT_REASONS } from "@unsaid/shared";
import { Button, ConfirmDialog, Modal, Switch, TextareaField } from "@/components/ui";
import { ShareActions } from "@/components/public/ShareActions";
import { useMe } from "@/components/app/MeProvider";

export function ReplyDialog({ message, onClose, onSubmit }: { message: MessageDto | null; onClose: () => void; onSubmit: (text: string, isPublic: boolean) => Promise<void> }) {
  const { me } = useMe();
  const [text, setText] = useState("");
  const [isPublic, setPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (message) { setText(""); setPublic(true); setError(null); setBusy(false); } }, [message]);

  async function submit() {
    const t = text.trim();
    if (!t) { setError("Write a reply first"); return; }
    setBusy(true);
    try { await onSubmit(t, isPublic); } catch { setBusy(false); }
  }

  return (
    <Modal
      open={!!message}
      onClose={onClose}
      title="Reply"
      description="Answer privately, or publish it as a share card."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>{isPublic ? "Post reply" : "Save reply"}</Button></>}
    >
      {message && (
        <div className="space-y-4">
          <blockquote className="max-h-32 overflow-y-auto rounded-md bg-raised p-3 text-sm italic [overflow-wrap:anywhere]">{message.body}</blockquote>
          <TextareaField label="Your reply" data-autofocus value={text} onChange={(e) => { setText(e.target.value); setError(null); }} maxLength={LIMITS.replyMax} rows={4} error={error} counter={`${text.length}/${LIMITS.replyMax}`} />
          <Switch checked={isPublic} onChange={setPublic} label="Show on my public page" description={me.user.emailVerified ? "Anyone can see the question and your answer, and share it. The sender stays anonymous." : "Verify your email first. Public answers need a verified address."} />
        </div>
      )}
    </Modal>
  );
}

export function ReportDialog({ message, onClose, onSubmit }: { message: MessageDto | null; onClose: () => void; onSubmit: (reason: string, details?: string) => Promise<void> }) {
  const [reason, setReason] = useState<string>("harassment");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (message) { setReason("harassment"); setDetails(""); setBusy(false); } }, [message]);

  const label: Record<string, string> = { harassment: "Harassment or bullying", threat: "Threat of harm", hate: "Hate speech", sexual: "Sexual content", self_harm: "Self-harm", personal_info: "Shares personal information", spam: "Spam or scam", other: "Something else" };

  return (
    <Modal
      open={!!message}
      onClose={onClose}
      title="Report message"
      description="Reports go to our moderators. Reporting doesn't reveal anything to the sender, and we never claim to know who they are."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy} onClick={async () => { setBusy(true); try { await onSubmit(reason, details.trim() || undefined); } catch { setBusy(false); } }}>Send report</Button></>}
    >
      <fieldset className="space-y-1">
        <legend className="mb-2 text-sm font-medium">Reason</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 hover:bg-raised has-[:checked]:bg-raised">
            <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="size-4 accent-[var(--primary)]" data-autofocus={r === "harassment" || undefined} />
            <span>{label[r] ?? r}</span>
          </label>
        ))}
      </fieldset>
      <TextareaField className="mt-3" label="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={LIMITS.reportDetailsMax} rows={3} counter={`${details.length}/${LIMITS.reportDetailsMax}`} />
    </Modal>
  );
}

export function DeleteDialog({ message, onClose, onConfirm }: { message: MessageDto | null; onClose: () => void; onConfirm: () => void }) {
  return (
    <ConfirmDialog open={!!message} onClose={onClose} onConfirm={onConfirm} danger title="Delete this message?" confirmLabel="Delete" description="It's removed from your inbox for good. Any public answer based on it is removed too." />
  );
}

export function BlockDialog({ message, onClose, onConfirm }: { message: MessageDto | null; onClose: () => void; onConfirm: () => void }) {
  return (
    <ConfirmDialog open={!!message} onClose={onClose} onConfirm={onConfirm} danger title="Block this sender?" confirmLabel="Block" description="Future messages from the same anonymous source are quietly dropped, and this message is archived.">
      <p className="rounded-md bg-raised p-3 text-sm text-muted">Honest note: we block a network signal, not a person. We never learn who sent a message, and someone on a different network could still write to you. Combine blocking with hidden words and reports.</p>
    </ConfirmDialog>
  );
}

export function ShareDialog({ message, onClose, onReply }: { message: MessageDto | null; onClose: () => void; onReply: (m: MessageDto) => void }) {
  const answerId = message?.reply?.public ? message.reply.answerId : null;
  return (
    <Modal open={!!message} onClose={onClose} title="Share this answer" description={answerId ? "Post the link or download the share card." : undefined}>
      {message && answerId && <ShareActions path={`/a/${answerId}`} text={`“${message.body.slice(0, 90)}” — my answer on EAR`} cardPath={`/api/share-card/${answerId}`} />}
      {message && !answerId && (
        <div className="space-y-4">
          <p className="text-muted">Only public replies can be shared. {message.reply ? "Your reply is private. Remove it and reply publicly to share." : "Reply publicly and this message becomes a share card."}</p>
          {!message.reply && <Button onClick={() => { onClose(); onReply(message); }}>Reply publicly</Button>}
        </div>
      )}
    </Modal>
  );
}
