import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

/** Confirm dialog with an optional moderator note. `onConfirm` receives the raw note. Errors thrown keep the dialog open. */
export function ConfirmDialog({ open, title, body, confirmLabel, danger, onClose, onConfirm }: {
  open: boolean; title: string; body: ReactNode; confirmLabel: string; danger?: boolean; onClose: () => void; onConfirm: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const close = () => { if (!busy) { setNote(""); onClose(); } };
  const submit = async () => {
    setBusy(true);
    try { await onConfirm(note); setNote(""); } catch { /* caller shows the error toast; keep dialog open */ } finally { setBusy(false); }
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      busy={busy}
      footer={<>
        <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={submit}>{confirmLabel}</Button>
      </>}
    >
      <div className="confirm-body">{body}</div>
      <label className="field">
        <span className="field-label">Note (optional, saved to the audit log)</span>
        <textarea className="input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} data-autofocus />
      </label>
    </Modal>
  );
}
