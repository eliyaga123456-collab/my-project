import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { client } from "../lib/client";
import { useAsync } from "../lib/hooks";
import { formatNumber, formatPercent } from "../lib/format";
import { Button, Card, ErrorState, PageHeader, Skeleton, StatCard, Tabs, TimeChart } from "../ui";

export function Overview() {
  const { data, error, loading, reload } = useAsync(() => client.admin.overview(), []);
  const [mode, setMode] = useState<"line" | "bar">("line");

  return (
    <>
      <PageHeader title="Overview" subtitle="How Unsaid is doing right now." actions={<Button size="sm" icon={<RefreshCw size={14} aria-hidden />} onClick={() => reload()}>Refresh</Button>} />
      {error && !data ? <ErrorState message={error} onRetry={() => reload()} /> : (
        <>
          <div className="stat-grid" aria-busy={loading}>
            {!data ? Array.from({ length: 11 }, (_, i) => <div key={i} className="stat"><Skeleton width={80} height={12} /><Skeleton width={60} height={28} /></div>) : <>
              <StatCard label="Total users" value={formatNumber(data.users.total)} hint={`${formatNumber(data.users.suspended)} suspended · ${formatNumber(data.users.banned)} banned`} />
              <StatCard label="Active (7d)" value={formatNumber(data.users.active7d)} />
              <StatCard label="New today" value={formatNumber(data.users.newToday)} />
              <StatCard label="Messages total" value={formatNumber(data.messages.total)} />
              <StatCard label="Messages today" value={formatNumber(data.messages.today)} />
              <StatCard label="Filtered" value={formatNumber(data.messages.filtered)} hint="held in Filtered folders" />
              <StatCard label="Rejected today" value={formatNumber(data.messages.rejectedToday)} />
              <StatCard label="Open reports" value={formatNumber(data.reports.open)} hint={`${formatNumber(data.reports.total)} total`} tone={data.reports.open > 0 ? "warning" : undefined} />
              <StatCard label="Block rate" value={formatPercent(data.rates.blockRate)} />
              <StatCard label="Report rate" value={formatPercent(data.rates.reportRate)} />
              <StatCard label="Moderation rate" value={formatPercent(data.rates.moderationRate)} />
            </>}
          </div>
          <Card title="Daily activity" actions={<Tabs label="Chart type" value={mode} onChange={setMode} tabs={[{ value: "line", label: "Lines" }, { value: "bar", label: "Bars" }]} />}>
            {!data ? <Skeleton height={260} radius={12} /> : data.daily.length === 0 ? <p className="muted">No daily data yet.</p> : (
              <TimeChart
                mode={mode}
                dates={data.daily.map((d) => d.date)}
                series={[
                  { key: "messages", label: "Messages", color: "var(--primary)", values: data.daily.map((d) => d.messages) },
                  { key: "reports", label: "Reports", color: "var(--warning)", values: data.daily.map((d) => d.reports) },
                  { key: "signups", label: "Signups", color: "var(--secondary)", values: data.daily.map((d) => d.signups) }
                ]}
              />
            )}
          </Card>
        </>
      )}
    </>
  );
}
