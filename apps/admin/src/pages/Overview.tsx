import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronRight, CircleCheck, Eye, FileClock, Flag, HeartPulse, MessageSquareText, Radio, RefreshCw, Search, ShieldAlert, ShieldCheck, TriangleAlert, UserPlus } from "lucide-react";
import { client } from "../lib/client";
import { useAsync } from "../lib/hooks";
import { useT } from "../i18n";
import { Button, Card, CountUp, ErrorState, Ltr, PageHeader, Skeleton, Sparkline, StatCard, Tabs, TimeChart } from "../ui";

const st = (i: number) => ({ "--i": i }) as CSSProperties;

export function Overview() {
  const { t, tn, fmt } = useT();
  const { data, error, loading, reload } = useAsync(() => client.admin.overview(), []);
  const [mode, setMode] = useState<"line" | "bar">("line");
  const n = fmt.number;
  const act = useAsync(() => client.admin.activity(), []);
  const roundsToday = useMemo(() => {
    if (!act.data) return null;
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return act.data.rounds.filter((r) => Date.parse(r.createdAt) >= d.getTime()).length;
  }, [act.data]);
  const spark = (k: "messages" | "reports" | "signups") => (data?.daily ?? []).slice(-14).map((d) => d[k]);
  const reload2 = () => { reload(); act.reload(); };

  const open = data?.reports.open ?? 0;
  const attention: { key: string; icon: typeof Flag; text: string; body: string; to: string }[] = [];
  if (data) {
    if (data.messages.rejectedToday > 0) attention.push({ key: "rej", icon: ShieldAlert, text: t("att.rejected", { n: n(data.messages.rejectedToday) }), body: t("att.rejectedBody"), to: "/moderation" });
    if (data.messages.filtered > 0) attention.push({ key: "fil", icon: ShieldCheck, text: t("att.filtered", { n: n(data.messages.filtered) }), body: t("att.filteredBody"), to: "/moderation" });
  }

  return (
    <>
      <PageHeader
        title={t("hero.hello")}
        subtitle={t("overview.subtitle")}
        actions={<><span className="live-chip"><i className="pulse" aria-hidden />{t("hero.live")}</span><Button size="sm" icon={<RefreshCw size={14} aria-hidden />} onClick={reload2}>{t("common.refresh")}</Button></>}
      />
      {error && !data ? <ErrorState message={error} onRetry={reload2} /> : (
        <div className="dash" aria-busy={loading}>
          {/* 1. what needs me right now */}
          <section className="attn-wrap" aria-labelledby="attn-h" style={st(0)}>
            <h2 id="attn-h" className="section-label">{t("att.title")}</h2>
            {!data ? <div className="attn skeleton-box"><Skeleton height={26} width="60%" /><Skeleton height={14} /><Skeleton height={48} radius={14} /></div> : open > 0 ? (
              <div className="attn attn-alert glow-border">
                <span className="attn-icon" aria-hidden><TriangleAlert size={26} /></span>
                <div className="attn-main">
                  <p className="attn-title attn-line"><b className="attn-num"><CountUp value={open} format={n} /></b><span>{tn("att.reports", open)}</span></p>
                  <p className="attn-body">{t("att.reportsBody")}</p>
                </div>
                <Link to="/reports" className="btn btn-primary btn-lg attn-cta">{t("att.reportsGo")} <ArrowUpRight className="icon-dir" size={18} aria-hidden /></Link>
              </div>
            ) : (
              <div className="attn attn-ok">
                <span className="attn-icon" aria-hidden><CircleCheck size={26} /></span>
                <div className="attn-main"><p className="attn-title">{t("att.clearTitle")}</p><p className="attn-body">{t("att.clearBody")}</p></div>
              </div>
            )}
            {attention.length > 0 && (
              <ul className="attn-list">
                {attention.map((a) => (
                  <li key={a.key}><Link to={a.to}><a.icon size={20} aria-hidden /><span><strong>{a.text}</strong><small>{a.body}</small></span><ChevronRight className="icon-dir" size={18} aria-hidden /></Link></li>
                ))}
              </ul>
            )}
          </section>

          {/* 2. today at a glance */}
          <section aria-labelledby="today-h" style={st(1)}>
            <h2 id="today-h" className="section-label">{t("today.title")}</h2>
            <div className="today-grid">
              {!data ? Array.from({ length: 4 }, (_, i) => <div key={i} className="today-tile"><Skeleton width={70} height={12} /><Skeleton width={50} height={34} /><Skeleton height={30} /></div>) : <>
                <Link to="/rounds" className="today-tile" style={st(2)}><span className="tt-label"><Radio size={16} aria-hidden />{t("today.rounds")}</span><b className="tt-num">{roundsToday === null ? "–" : <CountUp value={roundsToday} format={n} />}</b><span className="tt-foot muted small">{t("quick.rounds")} <ChevronRight className="icon-dir" size={14} aria-hidden /></span></Link>
                <Link to="/activity" className="today-tile" style={st(3)}><span className="tt-label"><UserPlus size={16} aria-hidden />{t("today.users")}</span><b className="tt-num"><CountUp value={data.users.newToday} format={n} /></b><Sparkline values={spark("signups")} tone="orange" /></Link>
                <Link to="/moderation" className="today-tile" style={st(4)}><span className="tt-label"><MessageSquareText size={16} aria-hidden />{t("today.messages")}</span><b className="tt-num"><CountUp value={data.messages.today} format={n} /></b><Sparkline values={spark("messages")} /></Link>
                <Link to="/reports" className={`today-tile ${open > 0 ? "is-alert" : ""}`} style={st(5)}><span className="tt-label"><Flag size={16} aria-hidden />{t("today.reports")}</span><b className="tt-num"><CountUp value={open} format={n} /></b><Sparkline values={spark("reports")} tone="danger" /></Link>
              </>}
            </div>
          </section>

          {/* 3. quick actions */}
          <section aria-labelledby="quick-h" style={st(2)}>
            <h2 id="quick-h" className="section-label">{t("quick.title")}</h2>
            <div className="quick-grid">
              <Link to="/reports" className="quick"><Flag size={22} aria-hidden /><span>{t("quick.reports")}</span></Link>
              <Link to="/users" className="quick"><Search size={22} aria-hidden /><span>{t("quick.users")}</span></Link>
              <Link to="/rounds" className="quick"><Radio size={22} aria-hidden /><span>{t("quick.rounds")}</span></Link>
              <Link to="/moderation" className="quick"><ShieldCheck size={22} aria-hidden /><span>{t("quick.moderation")}</span></Link>
              <Link to="/audit" className="quick"><FileClock size={22} aria-hidden /><span>{t("nav.audit")}</span></Link>
              <Link to="/health" className="quick"><HeartPulse size={22} aria-hidden /><span>{t("quick.health")}</span></Link>
            </div>
          </section>

          <Card title={t("home.latest")} actions={<Link className="btn btn-sm btn-ghost" to="/rounds">{t("common.seeAll")}</Link>}>
            <p className="muted small section-hint">{t("home.latestHint")}</p>
            {!act.data ? <Skeleton height={60} radius={12} /> : act.data.rounds.length === 0 ? <p className="muted">{t("home.latestEmpty")}</p> : (
              <ul className="mini-rounds">
                {[...act.data.rounds].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5).map((r) => (
                  <li key={r.id}><Link to={`/rounds/${r.id}`}><strong dir="auto">{r.label}</strong><span className="muted small"><Ltr>@{r.ownerUsername}</Ltr> · <Eye size={13} aria-hidden /> {n(r.views)} · <MessageSquareText size={13} aria-hidden /> {n(r.messages)}</span></Link></li>
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
                  { key: "messages", label: t("chart.messages"), color: "var(--chart-1)", values: data.daily.map((d) => d.messages) },
                  { key: "reports", label: t("chart.reports"), color: "var(--chart-2)", values: data.daily.map((d) => d.reports) },
                  { key: "signups", label: t("chart.signups"), color: "var(--chart-3)", values: data.daily.map((d) => d.signups) }
                ]}
              />
            )}
          </Card>

          <details className="fold">
            <summary><span><strong>{t("overview.allNumbers")}</strong><small>{t("overview.allNumbersHint")}</small></span><ChevronRight className="fold-chev" size={20} aria-hidden /></summary>
            <div className="stat-grid">
              {!data ? null : <>
                <StatCard index={0} label={t("overview.totalUsers")} count={data.users.total} format={n} hint={t("overview.totalUsersHint", { suspended: n(data.users.suspended), banned: n(data.users.banned) })} />
                <StatCard index={1} label={t("overview.active7d")} count={data.users.active7d} format={n} />
                <StatCard index={2} label={t("overview.newToday")} count={data.users.newToday} format={n} />
                <StatCard index={3} label={t("overview.messagesTotal")} count={data.messages.total} format={n} />
                <StatCard index={4} label={t("overview.messagesToday")} count={data.messages.today} format={n} />
                <StatCard index={5} label={t("overview.filtered")} count={data.messages.filtered} format={n} hint={t("overview.filteredHint")} />
                <StatCard index={6} label={t("overview.rejectedToday")} count={data.messages.rejectedToday} format={n} />
                <StatCard index={7} label={t("overview.openReports")} count={data.reports.open} format={n} hint={t("overview.openReportsHint", { total: n(data.reports.total) })} tone={open > 0 ? "warning" : undefined} />
                <StatCard index={8} label={t("overview.blockRate")} value={fmt.percent(data.rates.blockRate)} />
                <StatCard index={9} label={t("overview.reportRate")} value={fmt.percent(data.rates.reportRate)} />
                <StatCard index={10} label={t("overview.moderationRate")} value={fmt.percent(data.rates.moderationRate)} />
              </>}
            </div>
          </details>

          <details className="fold fold-quiet">
            <summary><span><strong>{t("see.toggle")}</strong></span><ChevronRight className="fold-chev" size={20} aria-hidden /></summary>
            <div className="fold-body"><p>{t("see.yes")}</p><p className="muted">{t("see.no")}</p><Link to="/help" className="link">{t("see.help")}</Link></div>
          </details>
        </div>
      )}
    </>
  );
}
