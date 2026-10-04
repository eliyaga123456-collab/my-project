import type { AdminAuditLogDto } from "@unsaid/shared";
import { client } from "../lib/client";
import { usePaged } from "../lib/hooks";
import { shortId, truncate } from "../lib/format";
import { useT } from "../i18n";
import { EmptyState, ErrorState, LoadMore, Ltr, PageHeader, SkeletonRows, Table, type Column } from "../ui";

function metaText(m: AdminAuditLogDto["meta"]): string {
  if (!m) return "";
  try { return JSON.stringify(m); } catch { return ""; }
}

export function AuditPage() {
  const { t, te, fmt } = useT();
  const list = usePaged((cursor) => client.admin.auditLogs(cursor), []);
  const columns: Column<AdminAuditLogDto>[] = [
    { key: "time", header: t("audit.col.time"), render: (l) => <time dateTime={l.createdAt}>{fmt.dateTime(l.createdAt)}</time> },
    { key: "actor", header: t("audit.col.actor"), render: (l) => l.actorId ? <Ltr className="mono" title={l.actorId}>{shortId(l.actorId)}</Ltr> : <span className="mono">{t("common.system")}</span> },
    { key: "action", header: t("audit.col.action"), render: (l) => <strong>{te("audit", l.action)}</strong> },
    { key: "target", header: t("audit.col.target"), render: (l) => l.targetType ? <span><span className="muted">{te("target", l.targetType)}</span> <Ltr className="mono" title={l.targetId ?? undefined}>{shortId(l.targetId)}</Ltr></span> : <span className="muted">–</span> },
    { key: "meta", header: t("audit.col.details"), className: "wide", render: (l) => { const m = metaText(l.meta); return m ? <Ltr className="meta" title={m}><code>{truncate(m, 140)}</code></Ltr> : <span className="muted">–</span>; } }
  ];
  return (
    <>
      <PageHeader title={t("audit.title")} subtitle={t("audit.subtitle")} />
      {list.loading ? <SkeletonRows label={t("audit.loading")} /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.items.length === 0 ? <EmptyState title={t("audit.empty")} /> : (
        <>
          <Table caption={t("audit.caption")} columns={columns} rows={list.items} rowKey={(l) => l.id} />
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} error={list.moreError} onClick={list.loadMore} shown={list.items.length} />
        </>
      )}
    </>
  );
}
