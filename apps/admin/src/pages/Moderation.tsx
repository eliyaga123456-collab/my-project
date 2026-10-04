import type { AdminModerationEventDto } from "@unsaid/shared";
import { client } from "../lib/client";
import { usePaged } from "../lib/hooks";
import { shortId } from "../lib/format";
import { useT } from "../i18n";
import { Badge, EmptyState, ErrorState, LoadMore, Ltr, PageHeader, SkeletonRows, StatusBadge, Table, type Column } from "../ui";

export function ModerationPage() {
  const { t, te, fmt } = useT();
  const list = usePaged((cursor) => client.admin.moderationEvents(cursor), []);
  const columns: Column<AdminModerationEventDto>[] = [
    { key: "time", header: t("moderation.col.time"), render: (e) => <time dateTime={e.createdAt}>{fmt.dateTime(e.createdAt)}</time> },
    { key: "kind", header: t("moderation.col.kind"), render: (e) => te("kind", e.kind) },
    { key: "outcome", header: t("moderation.col.outcome"), render: (e) => <StatusBadge status={e.outcome} /> },
    { key: "cats", header: t("moderation.col.categories"), render: (e) => e.categories.length ? <span className="badges">{e.categories.map((c) => <Badge key={c} tone="ember">{te("category", c)}</Badge>)}</span> : <span className="muted">{t("common.none")}</span> },
    { key: "msg", header: t("moderation.col.message"), render: (e) => <Ltr className="mono" title={e.messageId ?? undefined}>{shortId(e.messageId)}</Ltr> },
    { key: "user", header: t("moderation.col.user"), render: (e) => <Ltr className="mono" title={e.userId ?? undefined}>{shortId(e.userId)}</Ltr> }
  ];
  return (
    <>
      <PageHeader title={t("moderation.title")} subtitle={t("moderation.subtitle")} />
      {list.loading ? <SkeletonRows label={t("moderation.loading")} /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.items.length === 0 ? <EmptyState title={t("moderation.empty")} /> : (
        <>
          <Table caption={t("moderation.caption")} columns={columns} rows={list.items} rowKey={(e) => e.id} />
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} error={list.moreError} onClick={list.loadMore} shown={list.items.length} />
        </>
      )}
    </>
  );
}
