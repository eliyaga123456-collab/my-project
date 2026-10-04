"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Eye, Forward, MessageSquare, ShieldBan } from "lucide-react";
import type { AnalyticsDto } from "@unsaid/shared";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { buildChart, formatDay } from "@/lib/chart";
import { compactNumber } from "@/lib/format";
import { EmptyState, ErrorState, Skeleton, Tabs } from "@/components/ui";

const W = 640;
const H = 220;
const PAD = { l: 36, r: 8, t: 8, b: 28 };

function Tile({ icon: Icon, label, value, flip }: { icon: typeof Eye; label: string; value: number; flip?: boolean }) {
  return (
    <div className="veil p-4 sm:p-5">
      <p className="relative flex items-center gap-2 text-sm text-muted"><Icon className={flip ? "size-4 rtl:-scale-x-100" : "size-4"} aria-hidden />{label}</p>
      <p className="relative mt-1 font-display text-3xl font-extrabold tabular-nums">{compactNumber(value)}</p>
    </div>
  );
}

export function AnalyticsView() {
  const { t, locale } = useT();
  const fd = (d: string) => formatDay(d, locale);
  const [days, setDays] = useState("14");
  const [data, setData] = useState<AnalyticsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (d: string) => {
    setError(null);
    setData(null);
    try { setData(await api.analytics.me(Number(d))); } catch (e) { setError(errorMessage(e, t("public.errors.generic"))); }
  }, [t]);
  useEffect(() => { void load(days); }, [days, load]);

  const chart = data ? buildChart(data.daily, W - PAD.l - PAD.r, H - PAD.t - PAD.b) : null;
  const empty = data ? data.totals.views === 0 && data.totals.messages === 0 : false;
  const labelEvery = data ? Math.ceil(data.daily.length / 7) : 1;

  return (
    <div>
      <div className="mb-6"><Tabs label={t("app.analytics.range")} idPrefix="range" value={days} onChange={setDays} tabs={[{ id: "7", label: t("app.analytics.d7") }, { id: "14", label: t("app.analytics.d14") }, { id: "30", label: t("app.analytics.d30") }]} /></div>
      <div role="tabpanel" id="range-panel" aria-labelledby={`range-${days}`}>
        {error && <ErrorState title={t("common.state.error")} message={error} retryLabel={t("common.state.retry")} onRetry={() => load(days)} />}
        {!error && !data && (
          <div role="status" className="space-y-4"><span className="sr-only">{t("app.analytics.loading")}</span>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        )}
        {data && chart && (
          <div className="space-y-6 animate-ink-in">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile icon={Eye} label={t("app.analytics.views")} value={data.totals.views} />
              <Tile icon={MessageSquare} label={t("app.analytics.messages")} value={data.totals.messages} />
              <Tile flip icon={Forward} label={t("app.analytics.replies")} value={data.totals.replies} />
              <Tile icon={ShieldBan} label={t("app.analytics.blocked")} value={data.totals.blocked} />
            </div>
            {empty ? (
              <EmptyState icon={<BarChart3 className="size-6" aria-hidden />} title={t("app.analytics.emptyTitle")} description={t("app.analytics.emptyBody")} />
            ) : (
              <section aria-labelledby="chart-title" className="veil p-4 sm:p-6">
                <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 id="chart-title" className="text-lg font-bold">{t("app.analytics.chartTitle")}</h2>
                  <ul className="flex gap-4 text-xs text-muted" aria-hidden>
                    <li className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 rounded bg-secondary" />{t("app.analytics.legendViews")}</li>
                    <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-primary" />{t("app.analytics.legendMessages")}</li>
                  </ul>
                </div>
                <div dir="ltr"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="chart-title chart-desc" className="relative h-auto w-full">
                  <desc id="chart-desc">{t("app.analytics.chartDesc", { days })}</desc>
                  <g transform={`translate(${PAD.l},${PAD.t})`}>
                    {chart.ticks.map((t) => (
                      <g key={t.label + t.y}>
                        <line x1={0} x2={W - PAD.l - PAD.r} y1={t.y} y2={t.y} stroke="var(--border)" strokeWidth={1} />
                        <text x={-8} y={t.y + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{t.label}</text>
                      </g>
                    ))}
                    {chart.bars.map((b) => <rect key={b.date} x={b.x} y={b.y} width={b.w} height={Math.max(b.h, 0)} rx={3} fill="var(--primary)" opacity={0.9}><title>{t("app.analytics.barTitle", { date: fd(b.date), value: b.value })}</title></rect>)}
                    <path d={chart.line} fill="none" stroke="var(--secondary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                    {chart.dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={3} fill="var(--bg)" stroke="var(--secondary)" strokeWidth={2} />)}
                    {data.daily.map((p, i) => (i % labelEvery === 0 ? <text key={p.date} x={(i + 0.5) * ((W - PAD.l - PAD.r) / data.daily.length)} y={H - PAD.t - 6} textAnchor="middle" fontSize={11} fill="var(--muted)">{fd(p.date)}</text> : null))}
                  </g>
                </svg></div>
                <table className="sr-only">
                  <caption>{t("app.analytics.tableCaption")}</caption>
                  <thead><tr><th>{t("app.analytics.thDate")}</th><th>{t("app.analytics.legendViews")}</th><th>{t("app.analytics.legendMessages")}</th></tr></thead>
                  <tbody>{data.daily.map((p) => <tr key={p.date}><td>{fd(p.date)}</td><td>{p.views}</td><td>{p.messages}</td></tr>)}</tbody>
                </table>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
