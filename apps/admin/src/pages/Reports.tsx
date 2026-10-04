import { useState } from "react";
import { Ban, EyeOff, ShieldOff, X } from "lucide-react";
import type { AdminReportDto, ReportStatus } from "@unsaid/shared";
import type { ReportAction } from "@unsaid/api-client";
import { useAuth } from "../auth";
import { client, errorMessage } from "../lib/client";
import { usePaged } from "../lib/hooks";
import { canBan, cleanNote, formatDateTime, formatRelative, labelize } from "../lib/format";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, LoadMore, PageHeader, SkeletonRows, StatusBadge, Tabs, useToast } from "../ui";

const SOURCE_NOTE = "Senders are anonymous and have no accounts, so this acts on the anonymous source (a one-way hashed reference), not on the recipient.";
const COPY: Record<ReportAction, { label: string; title: string; danger: boolean; done: string; body: (r: AdminReportDto) => string }> = {
  dismiss: { label: "Dismiss", title: "Dismiss report", danger: false, done: "Report dismissed", body: () => "The report will be closed without action." },
  remove_message: { label: "Remove message", title: "Remove message", danger: true, done: "Message removed", body: () => "The message will be removed from the recipient's inbox and the report resolved. The sender is not penalised." },
  suspend_user: { label: "Suspend source (7 days)", title: "Suspend source for 7 days", danger: true, done: "Source suspended for 7 days", body: () => `${SOURCE_NOTE} The source will be blocked from sending messages to anyone on EAR for 7 days, and the report resolved.` },
  ban_user: { label: "Ban source", title: "Ban source", danger: true, done: "Source banned", body: () => `${SOURCE_NOTE} The source will be banned from sending messages platform-wide until an admin lifts the ban, and the report resolved.` }
};
const ICON = { dismiss: X, remove_message: EyeOff, suspend_user: ShieldOff, ban_user: Ban } as const;

export function ReportsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState<ReportStatus>("open");
  const list = usePaged((cursor) => client.admin.reports({ status, cursor, limit: 20 }), [status]);
  const [pending, setPending] = useState<{ report: AdminReportDto; action: ReportAction } | null>(null);

  const resolve = async (note: string) => {
    if (!pending) return;
    const { report, action } = pending;
    // optimistic: remove from the open list immediately, restore on failure
    const snapshot = list.items;
    const index = snapshot.findIndex((r) => r.id === report.id);
    if (status === "open") list.setItems((l) => l.filter((r) => r.id !== report.id));
    setPending(null);
    try {
      await client.admin.resolveReport(report.id, action, cleanNote(note));
      toast.success(COPY[action].done);
    } catch (e) {
      if (status === "open") list.setItems((l) => (l.some((r) => r.id === report.id) ? l : [...l.slice(0, index), report, ...l.slice(index)]));
      toast.error(errorMessage(e));
    }
  };

  const actions: ReportAction[] = (["dismiss", "remove_message", "suspend_user", ...(canBan(user?.role) ? ["ban_user"] : [])] as ReportAction[]);

  return (
    <>
      <PageHeader title="Reports" subtitle="Messages flagged by recipients. Reporter and sender identities are never shown." />
      <Tabs label="Report status" value={status} onChange={setStatus} tabs={[{ value: "open", label: "Open" }, { value: "resolved", label: "Resolved" }, { value: "dismissed", label: "Dismissed" }]} />
      <div className="stack">
        {list.loading ? <SkeletonRows rows={3} label="Loading reports" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.items.length === 0 ? (
          <EmptyState title={status === "open" ? "Inbox zero" : `No ${status} reports`} hint={status === "open" ? "No reports need attention." : undefined} />
        ) : (
          <>
            {list.items.map((r) => (
              <Card as="article" key={r.id} className="report">
                <div className="report-top">
                  <span className="badges"><Badge tone="ember">{labelize(r.reason)}</Badge><StatusBadge status={r.status} />{r.sameSourceReports > 1 && <Badge tone="danger">{r.sameSourceReports} reports from same source</Badge>}</span>
                  <time className="muted small" dateTime={r.createdAt} title={formatDateTime(r.createdAt)}>{formatRelative(r.createdAt)}</time>
                </div>
                <blockquote className="msg-body">{r.message.body}</blockquote>
                {r.message.filteredCategories.length > 0 && <p className="small muted">Auto-filter flagged: {r.message.filteredCategories.map(labelize).join(", ")}</p>}
                {r.details && <p className="report-details"><span className="muted small">Reporter's details</span><br />{r.details}</p>}
                <p className="small muted">Recipient <strong>@{r.recipient.username}</strong> <StatusBadge status={r.recipient.status} />{r.resolution && <> · Resolution: {labelize(r.resolution)}</>}{r.resolvedAt && <> · {formatRelative(r.resolvedAt)}</>}</p>
                {r.status === "open" && (
                  <div className="row-actions">
                    {actions.map((a) => { const I = ICON[a]; return <Button key={a} size="sm" variant={a === "dismiss" ? "ghost" : COPY[a].danger ? "danger" : "secondary"} icon={<I size={14} aria-hidden />} onClick={() => setPending({ report: r, action: a })}>{COPY[a].label}</Button>; })}
                  </div>
                )}
              </Card>
            ))}
            <LoadMore hasMore={list.hasMore} loading={list.loadingMore} error={list.moreError} onClick={list.loadMore} shown={list.items.length} />
          </>
        )}
      </div>
      {pending && <ConfirmDialog open title={COPY[pending.action].title} confirmLabel={COPY[pending.action].label} danger={COPY[pending.action].danger} body={<p>{COPY[pending.action].body(pending.report)}</p>} onClose={() => setPending(null)} onConfirm={resolve} />}
    </>
  );
}
