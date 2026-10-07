import { useEffect, useState } from "react";
import { Pause, Play, RefreshCw } from "lucide-react";
import { client } from "../lib/client";
import { useAsync } from "../lib/hooks";
import { useT } from "../i18n";
import { Badge, Button, ErrorState, Ltr, PageHeader, SkeletonRows, StatCard } from "../ui";

const REFRESH_MS = 15_000;

export function HealthPage() {
  const { t, fmt } = useT();
  const { data, error, loading, reload } = useAsync(() => client.admin.health(), []);
  const [paused, setPaused] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => reload(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [paused, reload]);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(id); }, []);

  return (
    <>
      <PageHeader title={t("health.title")} subtitle={paused ? t("health.paused") : t("health.refreshing")}
        actions={<>
          <Button size="sm" icon={paused ? <Play className="icon-dir" size={14} aria-hidden /> : <Pause size={14} aria-hidden />} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? t("health.resume") : t("health.pause")}</Button>
          <Button size="sm" icon={<RefreshCw size={14} aria-hidden />} onClick={() => reload(true)}>{t("health.refreshNow")}</Button>
        </>} />
      {loading && !data ? <SkeletonRows rows={3} label={t("health.loading")} /> : error && !data ? <ErrorState message={error} onRetry={() => reload()} /> : data && (
        <>
          {error && <p className="text-danger small" role="alert">{t("health.refreshFailed", { error })}</p>}
          <div className="status-line">
            <Badge tone={data.status === "ok" ? "success" : "warning"}>{data.status === "ok" ? t("health.ok") : t("health.degraded")}</Badge>
            <span className="muted small">{t("health.checked", { time: fmt.relative(data.checkedAt), version: data.version })}</span>
          </div>
          <div className="stat-grid">
            <StatCard label={t("health.database")} value={data.db.ok ? t("health.healthy") : t("health.down")} hint={t("health.latency", { n: fmt.number(data.db.latencyMs) })} tone={data.db.ok ? undefined : "danger"} />
            <StatCard label={t("health.uptime")} value={fmt.uptime(data.uptimeSeconds)} />
            <StatCard label={t("health.memory")} value={<Ltr>{fmt.number(data.memoryMb)} MB</Ltr>} />
            <StatCard label={t("health.requests")} count={data.counters.requests} format={fmt.number} />
            <StatCard label={t("health.errors5xx")} count={data.counters.errors5xx} format={fmt.number} tone={data.counters.errors5xx > 0 ? "danger" : undefined} />
            <StatCard label={t("health.rateLimited")} count={data.counters.rateLimited} format={fmt.number} />
          </div>
        </>
      )}
    </>
  );
}
