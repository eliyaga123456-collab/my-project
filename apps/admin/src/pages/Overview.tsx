import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Flag, MessageSquareText, RefreshCw, UserPlus } from "lucide-react";
import { client } from "../lib/client";
import { useAsync } from "../lib/hooks";
import { useT } from "../i18n";
import { Button, Card, ErrorState, PageHeader, Skeleton, StatCard, Tabs, TimeChart } from "../ui";

export function Overview() {
  const { t, fmt } = useT();
  const { data, error, loading, reload } = useAsync(() => client.admin.overview(), []);
  const [mode, setMode] = useState<"line" | "bar">("line");
  const n = fmt.number;
  const act = useAsync(() => client.admin.activity(), []);

  return (
    <>
      <section className="hero" aria-label={t("hero.kicker")}>
        <div className="hero-top">
          <div><span className="hero-kicker"><i className="pulse" aria-hidden />{t("hero.kicker")} · {t("hero.live")}</span><h2 className="hero-title">{t("hero.hello")}</h2></div>
        </div>
        <div className="hero-tiles">
          <Link to="/reports" className={`hero-tile ${data && data.reports.open > 0 ? "alert" : ""}`}><Flag size={22} aria-hidden /><b>{data ? n(data.reports.open) : "–"}</b><span>{t("hero.reports")}</span><em>{t("hero.reportsGo")} <ArrowUpRight size={14} aria-hidden /></em></Link>
          <Link to="/activity" className="hero-tile"><UserPlus size={22} aria-hidden /><b>{data ? n(data.users.newToday) : "–"}</b><span>{t("hero.users")}</span><em>{t("hero.usersGo")} <ArrowUpRight size={14} aria-hidden /></em></Link>
          <Link to="/moderation" className="hero-tile"><MessageSquareText size={22} aria-hidden /><b>{data ? n(data.messages.today) : "–"}</b><span>{t("hero.msgs")}</span><em>{t("hero.msgsGo")} <ArrowUpRight size={14} aria-hidden /></em></Link>
        </div>
        <p className="hero-see"><strong>{t("see.title")}</strong><br />{t("see.yes")}<br /><span className="muted">{t("see.no")}</span></p>
      </section>
      <PageHeader title={t("overview.title")} subtitle={t("overview.subtitle")} actions={<Button size="sm" icon={<RefreshCw size={14} aria-hidden />} onClick={() => reload()}>{t("common.refresh")}</Button>} />
      {error && !data ? <ErrorState message={error} onRetry={() => reload()} /> : (
        <>
          <div className="stat-grid" aria-busy={loading}>
            {!data ? Array.from({ length: 11 }, (_, i) => <div key={i} className="stat"><Skeleton width={80} height={12} /><Skeleton width={60} height={28} /></div>) : <>
              <StatCard label={t("overview.totalUsers")} value={n(data.users.total)} hint={t("overview.totalUsersHint", { suspended: n(data.users.suspended), banned: n(data.users.banned) })} />
              <StatCard label={t("overview.active7d")} value={n(data.users.active7d)} />
              <StatCard label={t("overview.newToday")} value={n(data.users.newToday)} />
              <StatCard label={t("overview.messagesTotal")} value={n(data.messages.total)} />
              <StatCard label={t("overview.messagesToday")} value={n(data.messages.today)} />
              <StatCard label={t("overview.filtered")} value={n(data.messages.filtered)} hint={t("overview.filteredHint")} />
              <StatCard label={t("overview.rejectedToday")} value={n(data.messages.rejectedToday)} />
              <StatCard label={t("overview.openReports")} value={n(data.reports.open)} hint={t("overview.openReportsHint", { total: n(data.reports.total) })} tone={data.reports.open > 0 ? "warning" : undefined} />
              <StatCard label={t("overview.blockRate")} value={fmt.percent(data.rates.blockRate)} />
              <StatCard label={t("overview.reportRate")} value={fmt.percent(data.rates.reportRate)} />
              <StatCard label={t("overview.moderationRate")} value={fmt.percent(data.rates.moderationRate)} />
            </>}
          </div>
          <Card title={t("home.latest")} actions={<Link className="btn btn-sm btn-ghost" to="/rounds">{t("common.seeAll")}</Link>}>
            <p className="muted small section-hint">{t("home.latestHint")}</p>
            {!act.data ? <Skeleton height={60} radius={12} /> : act.data.rounds.length === 0 ? <p className="muted">{t("home.latestEmpty")}</p> : (
              <ul className="mini-rounds">
                {[...act.data.rounds].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5).map((r) => (
                  <li key={r.id}><Link to={`/rounds/${r.id}`}><strong dir="auto">{r.label}</strong><span className="muted small">@{r.ownerUsername} · {n(r.views)} / {n(r.messages)}</span></Link></li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={t("overview.daily")} actions={<Tabs label={t("overview.chartType")} value={mode} onChange={setMode} tabs={[{ value: "line", label: t("overview.lines") }, { value: "bar", label: t("overview.bars") }]} />}>
            {!data ? <Skeleton height={260} radius={12} /> : data.daily.length === 0 ? <p className="muted">{t("overview.noDaily")}</p> : (
              <TimeChart
                mode={mode}
                dates={data.daily.map((d) => d.date)}
                series={[
                  { key: "messages", label: t("chart.messages"), color: "var(--primary)", values: data.daily.map((d) => d.messages) },
                  { key: "reports", label: t("chart.reports"), color: "var(--warning)", values: data.daily.map((d) => d.reports) },
                  { key: "signups", label: t("chart.signups"), color: "var(--secondary)", values: data.daily.map((d) => d.signups) }
                ]}
              />
            )}
          </Card>
        </>
      )}
    </>
  );
}
