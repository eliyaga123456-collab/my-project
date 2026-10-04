import type { AdminModerationEventDto } from "@unsaid/shared";
import { client } from "../lib/client";
import { usePaged } from "../lib/hooks";
import { formatDateTime, labelize, shortId } from "../lib/format";
import { Badge, EmptyState, ErrorState, LoadMore, PageHeader, SkeletonRows, StatusBadge, Table, type Column } from "../ui";

const columns: Column<AdminModerationEventDto>[] = [
  { key: "time", header: "Time", render: (e) => <time dateTime={e.createdAt}>{formatDateTime(e.createdAt)}</time> },
  { key: "kind", header: "Kind", render: (e) => labelize(e.kind) },
  { key: "outcome", header: "Outcome", render: (e) => <StatusBadge status={e.outcome} /> },
  { key: "cats", header: "Categories", render: (e) => e.categories.length ? <span className="badges">{e.categories.map((c) => <Badge key={c} tone="ember">{labelize(c)}</Badge>)}</span> : <span className="muted">none</span> },
  { key: "msg", header: "Message", render: (e) => <span className="mono" title={e.messageId ?? undefined}>{shortId(e.messageId)}</span> },
  { key: "user", header: "User", render: (e) => <span className="mono" title={e.userId ?? undefined}>{shortId(e.userId)}</span> }
];

export function ModerationPage() {
  const list = usePaged((cursor) => client.admin.moderationEvents(cursor), []);
  return (
    <>
      <PageHeader title="Moderation events" subtitle="Automated decisions on incoming messages." />
      {list.loading ? <SkeletonRows label="Loading events" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.items.length === 0 ? <EmptyState title="No moderation events yet" /> : (
        <>
          <Table caption="Moderation events" columns={columns} rows={list.items} rowKey={(e) => e.id} />
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} error={list.moreError} onClick={list.loadMore} shown={list.items.length} />
        </>
      )}
    </>
  );
}
