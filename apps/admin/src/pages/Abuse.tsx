import { RefreshCw } from "lucide-react";
import type { AdminAbuseDto } from "@unsaid/shared";
import { client } from "../lib/client";
import { useAsync } from "../lib/hooks";
import { useT } from "../i18n";
import { Button, Card, EmptyState, ErrorState, Ltr, PageHeader, SkeletonRows, StatCard, Table, type Column } from "../ui";

type Source = AdminAbuseDto["topSources"][number];

export function AbusePage() {
  const { t, te, fmt } = useT();
  const { data, error, loading, reload } = useAsync(() => client.admin.abuse(), []);
  const max = Math.max(1, ...(data?.rejectedByCategory.map((c) => c.count) ?? [1]));
  const columns: Column<Source>[] = [
    { key: "ref", header: t("abuse.col.source"), render: (s) => <Ltr className="mono" title={s.sourceRef}>{s.sourceRef.length > 16 ? `${s.sourceRef.slice(0, 16)}…` : s.sourceRef}</Ltr> },
    { key: "m", header: t("abuse.col.messages"), className: "num", render: (s) => fmt.number(s.messages) },
    { key: "rej", header: t("abuse.col.rejected"), className: "num", render: (s) => fmt.number(s.rejected) },
    { key: "rep", header: t("abuse.col.reports"), className: "num", render: (s) => fmt.number(s.reports) },
    { key: "seen", header: t("abuse.col.lastSeen"), render: (s) => fmt.relative(s.lastSeenAt) }
  ];
  return (
    <>
      <PageHeader title={t("abuse.title")} subtitle={t("abuse.subtitle")} actions={<Button size="sm" icon={<RefreshCw size={14} aria-hidden />} onClick={() => reload()}>{t("common.refresh")}</Button>} />
      {loading && !data ? <SkeletonRows rows={4} label={t("abuse.loading")} /> : error && !data ? <ErrorState message={error} onRetry={() => reload()} /> : data && (
        <div className="stack">
          <div className="stat-grid two"><StatCard label={t("abuse.flooding")} count={data.floodingLast24h} format={fmt.number} hint={t("abuse.floodingHint")} tone={data.floodingLast24h > 0 ? "warning" : undefined} /></div>
          <Card title={t("abuse.byCategory")}>
            {data.rejectedByCategory.length === 0 ? <p className="muted">{t("abuse.nothingRejected")}</p> : (
              <ul className="bars">
                {data.rejectedByCategory.slice().sort((a, b) => b.count - a.count).map((c) => (
                  <li key={c.category}>
                    <span className="bar-label">{te("category", c.category)}</span>
                    <span className="bar-track" role="img" aria-label={`${te("category", c.category)}: ${fmt.number(c.count)}`}><span className="bar-fill" style={{ width: `${Math.max(2, (c.count / max) * 100)}%` }} /></span>
                    <span className="bar-val">{fmt.number(c.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={t("abuse.topSources")}>
            {data.topSources.length === 0 ? <EmptyState title={t("abuse.noSources")} /> : <Table caption={t("abuse.topSources")} columns={columns} rows={data.topSources} rowKey={(s) => s.sourceRef} />}
          </Card>
        </div>
      )}
    </>
  );
}
