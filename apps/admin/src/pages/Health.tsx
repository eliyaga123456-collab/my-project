import { useEffect, useState } from "react";
import { Pause, Play, RefreshCw } from "lucide-react";
import { client } from "../lib/client";
import { useAsync } from "../lib/hooks";
import { formatNumber, formatRelative, formatUptime } from "../lib/format";
import { Badge, Button, ErrorState, PageHeader, SkeletonRows, StatCard } from "../ui";

const REFRESH_MS = 15_000;

export function HealthPage() {
  const { data, error, loading, reload } = useAsync(() => client.admin.health(), []);
  const [paused, setPaused] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => reload(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [paused, reload]);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(t); }, []);

  return (
    <>
      <PageHeader title="System health" subtitle={paused ? "Auto-refresh paused." : "Refreshes every 15 seconds."}
        actions={<>
          <Button size="sm" icon={paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</Button>
          <Button size="sm" icon={<RefreshCw size={14} aria-hidden />} onClick={() => reload(true)}>Refresh now</Button>
        </>} />
      {loading && !data ? <SkeletonRows rows={3} label="Loading health" /> : error && !data ? <ErrorState message={error} onRetry={() => reload()} /> : data && (
        <>
          {error && <p className="text-danger small" role="alert">Latest refresh failed: {error}. Showing last known data.</p>}
          <div className="status-line">
            <Badge tone={data.status === "ok" ? "success" : "warning"}>{data.status === "ok" ? "All systems operational" : "Degraded"}</Badge>
            <span className="muted small">Checked {formatRelative(data.checkedAt)} · version {data.version}</span>
          </div>
          <div className="stat-grid">
            <StatCard label="Database" value={data.db.ok ? "Healthy" : "Down"} hint={`${formatNumber(data.db.latencyMs)} ms latency`} tone={data.db.ok ? undefined : "danger"} />
            <StatCard label="Uptime" value={formatUptime(data.uptimeSeconds)} />
            <StatCard label="Memory" value={`${formatNumber(data.memoryMb)} MB`} />
            <StatCard label="Requests" value={formatNumber(data.counters.requests)} />
            <StatCard label="5xx errors" value={formatNumber(data.counters.errors5xx)} tone={data.counters.errors5xx > 0 ? "danger" : undefined} />
            <StatCard label="Rate limited" value={formatNumber(data.counters.rateLimited)} />
          </div>
        </>
      )}
    </>
  );
}
