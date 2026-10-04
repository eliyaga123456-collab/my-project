import type { AdminAuditLogDto } from "@unsaid/shared";
import { client } from "../lib/client";
import { usePaged } from "../lib/hooks";
import { formatDateTime, labelize, shortId, truncate } from "../lib/format";
import { EmptyState, ErrorState, LoadMore, PageHeader, SkeletonRows, Table, type Column } from "../ui";

function metaText(m: AdminAuditLogDto["meta"]): string {
  if (!m) return "";
  try { return JSON.stringify(m); } catch { return ""; }
}

const columns: Column<AdminAuditLogDto>[] = [
  { key: "time", header: "Time", render: (l) => <time dateTime={l.createdAt}>{formatDateTime(l.createdAt)}</time> },
  { key: "actor", header: "Actor", render: (l) => <span className="mono" title={l.actorId ?? undefined}>{l.actorId ? shortId(l.actorId) : "system"}</span> },
  { key: "action", header: "Action", render: (l) => <strong>{labelize(l.action)}</strong> },
  { key: "target", header: "Target", render: (l) => l.targetType ? <span><span className="muted">{l.targetType}</span> <span className="mono" title={l.targetId ?? undefined}>{shortId(l.targetId)}</span></span> : <span className="muted">–</span> },
  { key: "meta", header: "Details", className: "wide", render: (l) => { const t = metaText(l.meta); return t ? <code className="meta" title={t}>{truncate(t, 140)}</code> : <span className="muted">–</span>; } }
];

export function AuditPage() {
  const list = usePaged((cursor) => client.admin.auditLogs(cursor), []);
  return (
    <>
      <PageHeader title="Audit log" subtitle="Every admin and moderator mutation, newest first." />
      {list.loading ? <SkeletonRows label="Loading audit log" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.items.length === 0 ? <EmptyState title="Nothing logged yet" /> : (
        <>
          <Table caption="Audit log" columns={columns} rows={list.items} rowKey={(l) => l.id} />
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} error={list.moreError} onClick={list.loadMore} shown={list.items.length} />
        </>
      )}
    </>
  );
}
