import { RefreshCw } from "lucide-react";
import type { AdminAbuseDto } from "@unsaid/shared";
import { client } from "../lib/client";
import { useAsync } from "../lib/hooks";
import { formatNumber, formatRelative, labelize } from "../lib/format";
import { Button, Card, EmptyState, ErrorState, PageHeader, SkeletonRows, StatCard, Table, type Column } from "../ui";

type Source = AdminAbuseDto["topSources"][number];
const columns: Column<Source>[] = [
  { key: "ref", header: "Source (hashed)", render: (s) => <span className="mono" title={s.sourceRef}>{s.sourceRef.length > 16 ? `${s.sourceRef.slice(0, 16)}…` : s.sourceRef}</span> },
  { key: "m", header: "Messages", className: "num", render: (s) => formatNumber(s.messages) },
  { key: "rej", header: "Rejected", className: "num", render: (s) => formatNumber(s.rejected) },
  { key: "rep", header: "Reports", className: "num", render: (s) => formatNumber(s.reports) },
  { key: "seen", header: "Last seen", render: (s) => formatRelative(s.lastSeenAt) }
];

export function AbusePage() {
  const { data, error, loading, reload } = useAsync(() => client.admin.abuse(), []);
  const max = Math.max(1, ...(data?.rejectedByCategory.map((c) => c.count) ?? [1]));
  return (
    <>
      <PageHeader title="Abuse detection" subtitle="Anonymous sources are shown as one-way hashes; identities are never revealed." actions={<Button size="sm" icon={<RefreshCw size={14} aria-hidden />} onClick={() => reload()}>Refresh</Button>} />
      {loading && !data ? <SkeletonRows rows={4} label="Loading abuse data" /> : error && !data ? <ErrorState message={error} onRetry={() => reload()} /> : data && (
        <div className="stack">
          <div className="stat-grid two"><StatCard label="Flooding sources (24h)" value={formatNumber(data.floodingLast24h)} hint="sources over the send-rate threshold" tone={data.floodingLast24h > 0 ? "warning" : undefined} /></div>
          <Card title="Rejected by category">
            {data.rejectedByCategory.length === 0 ? <p className="muted">Nothing rejected.</p> : (
              <ul className="bars">
                {data.rejectedByCategory.slice().sort((a, b) => b.count - a.count).map((c) => (
                  <li key={c.category}>
                    <span className="bar-label">{labelize(c.category)}</span>
                    <span className="bar-track" role="img" aria-label={`${labelize(c.category)}: ${c.count}`}><span className="bar-fill" style={{ width: `${Math.max(2, (c.count / max) * 100)}%` }} /></span>
                    <span className="bar-val">{formatNumber(c.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Top anonymous sources">
            {data.topSources.length === 0 ? <EmptyState title="No suspicious sources" /> : <Table caption="Top anonymous sources" columns={columns} rows={data.topSources} rowKey={(s) => s.sourceRef} />}
          </Card>
        </div>
      )}
    </>
  );
}
