"use client";

import { useEffect, useState } from "react";
import type { MessageDto } from "@unsaid/shared";
import { LIMITS, REPORT_REASONS } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import type { Key } from "@/i18n/translate";
import { Button, ConfirmDialog, Modal, Switch, TextareaField } from "@/components/ui";
import { ShareActions } from "@/components/public/ShareActions";
import { useMe } from "@/components/app/MeProvider";

export function ReplyDialog({ message, onClose, onSubmit }: { message: MessageDto | null; onClose: () => void; onSubmit: (text: string, isPublic: boolean) => Promise<void> }) {
  const { t } = useT();
  const { me } = useMe();
  const [text, setText] = useState("");
  const [isPublic, setPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (message) { setText(""); setPublic(true); setError(null); setBusy(false); } }, [message]);

  async function submit() {
    const body = text.trim();
    if (!body) { setError(t("app.dialogs.writeFirst")); return; }
    setBusy(true);
    try { await onSubmit(body, isPublic); } catch { setBusy(false); }
  }

  return (
    <Modal
      open={!!message}
      onClose={onClose}
      title={t("app.dialogs.replyTitle")}
      description={t("app.dialogs.replyDescription")}
      footer={<><Button variant="ghost" onClick={onClose}>{t("common.state.cancel")}</Button><Button loading={busy} onClick={submit}>{isPublic ? t("app.dialogs.postReply") : t("app.dialogs.saveReply")}</Button></>}
    >
      {message && (
        <div className="space-y-4">
          <blockquote dir="auto" className="max-h-32 overflow-y-auto rounded-md bg-raised p-3 text-sm italic [overflow-wrap:anywhere]">{message.body}</blockquote>
          <TextareaField label={t("app.dialogs.yourReplyLabel")} dir="auto" data-autofocus value={text} onChange={(e) => { setText(e.target.value); setError(null); }} maxLength={LIMITS.replyMax} rows={4} error={error} counter={`${text.length}/${LIMITS.replyMax}`} />
          <Switch checked={isPublic} onChange={setPublic} label={t("app.dialogs.showPublic")} description={me.user.emailVerified ? t("app.dialogs.publicVerified") : t("app.dialogs.publicUnverified")} />
        </div>
      )}
    </Modal>
  );
}

export function ReportDialog({ message, onClose, onSubmit }: { message: MessageDto | null; onClose: () => void; onSubmit: (reason: string, details?: string) => Promise<void> }) {
  const { t } = useT();
  const [reason, setReason] = useState<string>("harassment");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (message) { setReason("harassment"); setDetails(""); setBusy(false); } }, [message]);

  const label = (r: string) => (`app.dialogs.reason.${r}` as Key);

  return (
    <Modal
      open={!!message}
      onClose={onClose}
      title={t("app.dialogs.reportTitle")}
      description={t("app.dialogs.reportDescription")}
      footer={<><Button variant="ghost" onClick={onClose}>{t("common.state.cancel")}</Button><Button variant="danger" loading={busy} onClick={async () => { setBusy(true); try { await onSubmit(reason, details.trim() || undefined); } catch { setBusy(false); } }}>{t("app.dialogs.reportSend")}</Button></>}
    >
      <fieldset className="space-y-1">
        <legend className="mb-2 text-sm font-medium">{t("app.dialogs.reportReason")}</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 hover:bg-raised has-[:checked]:bg-raised">
            <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="size-4 accent-[var(--primary)]" data-autofocus={r === "harassment" || undefined} />
            <span>{t(label(r))}</span>
          </label>
        ))}
      </fieldset>
      <TextareaField className="mt-3" label={t("app.dialogs.reportDetails")} dir="auto" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={LIMITS.reportDetailsMax} rows={3} counter={`${details.length}/${LIMITS.reportDetailsMax}`} />
    </Modal>
  );
}

export function DeleteDialog({ message, onClose, onConfirm }: { message: MessageDto | null; onClose: () => void; onConfirm: () => void }) {
  const { t } = useT();
  return (
    <ConfirmDialog open={!!message} onClose={onClose} onConfirm={onConfirm} danger title={t("app.dialogs.deleteTitle")} confirmLabel={t("app.dialogs.deleteConfirm")} description={t("app.dialogs.deleteDescription")} />
  );
}

export function BlockDialog({ message, onClose, onConfirm }: { message: MessageDto | null; onClose: () => void; onConfirm: () => void }) {
  const { t } = useT();
  return (
    <ConfirmDialog open={!!message} onClose={onClose} onConfirm={onConfirm} danger title={t("app.dialogs.blockTitle")} confirmLabel={t("app.dialogs.blockConfirm")} description={t("app.dialogs.blockDescription")}>
      <p className="rounded-md bg-raised p-3 text-sm text-muted">{t("app.dialogs.blockNote")}</p>
    </ConfirmDialog>
  );
}

export function ShareDialog({ message, onClose, onReply }: { message: MessageDto | null; onClose: () => void; onReply: (m: MessageDto) => void }) {
  const { t } = useT();
  const answerId = message?.reply?.public ? message.reply.answerId : null;
  return (
    <Modal open={!!message} onClose={onClose} title={t("app.dialogs.shareTitle")} description={answerId ? t("app.dialogs.shareDescription") : undefined}>
      {message && answerId && <ShareActions path={`/a/${answerId}`} text={t("app.dialogs.shareText", { body: message.body.slice(0, 90) })} cardPath={`/api/share-card/${answerId}`} />}
      {message && !answerId && (
        <div className="space-y-4">
          <p className="text-muted">{t("app.dialogs.onlyPublic")} {message.reply ? t("app.dialogs.onlyPublicHasReply") : t("app.dialogs.onlyPublicNoReply")}</p>
          {!message.reply && <Button onClick={() => { onClose(); onReply(message); }}>{t("app.dialogs.replyPublicly")}</Button>}
        </div>
      )}
    </Modal>
  );
}
