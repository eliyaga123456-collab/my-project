import { useState } from "react";
import { client, errorMessage } from "../lib/client";
import { useT } from "../i18n";
import { Ltr } from "./index";

type Ev = Awaited<ReturnType<typeof client.admin.evidence>>;

/** Admin-only technical evidence for one message (each open is audit-logged server-side). */
export function Evidence({ messageId }: { messageId: string }) {
  const { t, fmt } = useT();
  const [ev, setEv] = useState<Ev | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (err) return <p className="small muted">{t("evidence.none")} ({err})</p>;
  if (!ev) return <button type="button" className="btn btn-sm btn-ghost" onClick={() => client.admin.evidence(messageId).then(setEv, (e) => setErr(errorMessage(e)))}>{t("evidence.show")}</button>;
  return (
    <div className="small">
      <strong>{t("evidence.title")}</strong><br />
      {t("evidence.ip")}: <Ltr>{ev.networkAddress}</Ltr> · {t("evidence.channel")}: <Ltr>{ev.channel}</Ltr><br />
      {t("evidence.sent")}: {fmt.dateTime(ev.sentAt)} · {t("evidence.until")}: {fmt.dateTime(ev.keepUntil)}
      {ev.userAgent ? <><br /><Ltr className="mono">{ev.userAgent.slice(0, 160)}</Ltr></> : null}
    </div>
  );
}
