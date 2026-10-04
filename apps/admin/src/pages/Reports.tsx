import { useState } from "react";
import { Ban, EyeOff, ShieldOff, X } from "lucide-react";
import type { AdminReportDto, ReportStatus } from "@unsaid/shared";
import type { ReportAction } from "@unsaid/api-client";
import { useAuth } from "../auth";
import { client, errorMessage } from "../lib/client";
import { usePaged } from "../lib/hooks";
import { canBan, cleanNote } from "../lib/format";
import { useT, type Key } from "../i18n";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, LoadMore, Ltr, PageHeader, SkeletonRows, StatusBadge, Tabs, useToast } from "../ui";

const DANGER: Record<ReportAction, boolean> = { dismiss: false, remove_message: true, suspend_user: true, ban_user: true };
const ICON = { dismiss: X, remove_message: EyeOff, suspend_user: ShieldOff, ban_user: Ban } as const;
const key = (a: ReportAction, part: "" | ".title" | ".done" | ".body") => `reports.action.${a}${part}` as Key;

export function ReportsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t, tn, te, fmt } = useT();
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
      toast.success(t(key(action, ".done")));
    } catch (e) {
      if (status === "open") list.setItems((l) => (l.some((r) => r.id === report.id) ? l : [...l.slice(0, index), report, ...l.slice(index)]));
      toast.error(errorMessage(e));
    }
  };

  const actions: ReportAction[] = (["dismiss", "remove_message", "suspend_user", ...(canBan(user?.role) ? ["ban_user"] : [])] as ReportAction[]);
  /** "ban_user:source_expired" -> "Source banned (source expired)" */
  const resolutionLabel = (r: string) => {
    const [base, note] = r.split(":");
    const label = te("resolution", base ?? r);
    return note ? `${label} (${te("resolutionNote", note)})` : label;
  };

  return (
    <>
      <PageHeader title={t("reports.title")} subtitle={t("reports.subtitle")} />
      <Tabs label={t("reports.statusLabel")} value={status} onChange={setStatus} tabs={[{ value: "open", label: t("reports.tab.open") }, { value: "resolved", label: t("reports.tab.resolved") }, { value: "dismissed", label: t("reports.tab.dismissed") }]} />
      <div className="stack">
        {list.loading ? <SkeletonRows rows={3} label={t("reports.loading")} /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.items.length === 0 ? (
          <EmptyState title={status === "open" ? t("reports.emptyOpen") : status === "resolved" ? t("reports.emptyResolved") : t("reports.emptyDismissed")} hint={status === "open" ? t("reports.emptyOpenHint") : undefined} />
        ) : (
          <>
            {list.items.map((r) => (
              <Card as="article" key={r.id} className="report">
                <div className="report-top">
                  <span className="badges"><Badge tone="ember">{te("category", r.reason)}</Badge><StatusBadge status={r.status} />{r.sameSourceReports > 1 && <Badge tone="danger">{tn("reports.sameSource", r.sameSourceReports)}</Badge>}</span>
                  <time className="muted small" dateTime={r.createdAt} title={fmt.dateTime(r.createdAt)}>{fmt.relative(r.createdAt)}</time>
                </div>
                <blockquote className="msg-body" dir="auto">{r.message.body}</blockquote>
                {r.message.filteredCategories.length > 0 && <p className="small muted">{t("reports.autoFilter", { categories: r.message.filteredCategories.map((c) => te("category", c)).join(", ") })}</p>}
                {r.details && <p className="report-details" dir="auto"><span className="muted small">{t("reports.details")}</span><br />{r.details}</p>}
                <p className="small muted">{t("reports.recipient")} <strong><Ltr>@{r.recipient.username}</Ltr></strong> <StatusBadge status={r.recipient.status} />{r.resolution && <> · {t("reports.resolution", { resolution: resolutionLabel(r.resolution) })}</>}{r.resolvedAt && <> · {fmt.relative(r.resolvedAt)}</>}</p>
                {r.status === "open" && (
                  <div className="row-actions">
                    {actions.map((a) => { const I = ICON[a]; return <Button key={a} size="sm" variant={a === "dismiss" ? "ghost" : DANGER[a] ? "danger" : "secondary"} icon={<I size={14} aria-hidden />} onClick={() => setPending({ report: r, action: a })}>{t(key(a, ""))}</Button>; })}
                  </div>
                )}
              </Card>
            ))}
            <LoadMore hasMore={list.hasMore} loading={list.loadingMore} error={list.moreError} onClick={list.loadMore} shown={list.items.length} />
          </>
        )}
      </div>
      {pending && (
        <ConfirmDialog open title={t(key(pending.action, ".title"))} confirmLabel={t(key(pending.action, ""))} danger={DANGER[pending.action]}
          body={<p>{pending.action === "suspend_user" || pending.action === "ban_user" ? `${t("reports.sourceNote")} ` : ""}{t(key(pending.action, ".body"))}</p>}
          onClose={() => setPending(null)} onConfirm={resolve} />
      )}
    </>
  );
}
