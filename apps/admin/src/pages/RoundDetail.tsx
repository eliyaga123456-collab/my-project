import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Copy, ExternalLink, Flag, Lock, Globe, ShieldAlert, Radio } from "lucide-react";
import { client } from "../lib/client";
import { useAsync } from "../lib/hooks";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import { Evidence } from "../ui/Evidence";
import { Badge, Button, Card, EmptyState, ErrorState, Ltr, OwnerBlock, Skeleton, SkeletonRows, StatCard, TimeChart, useToast } from "../ui";

export function RoundDetail() {
  const { id = "" } = useParams();
  const { t, te, fmt } = useT();
  const { user } = useAuth();
  const toast = useToast();
  const { data: r, error, reload } = useAsync(() => client.admin.round(id), [id]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(t("common.copied")); } catch { toast.error(t("common.copyFailed")); }
  };

  return (
    <>
      <Link to="/rounds" className="back-link"><ArrowLeft className="icon-dir" size={16} aria-hidden />{t("nav.rounds")}</Link>
      {error && !r ? <ErrorState title={t("round.notFound")} message={error} onRetry={() => reload()} /> : !r ? (
        <div className="stack"><Skeleton height={120} radius={16} /><SkeletonRows rows={3} /></div>
      ) : (
        <>
          <section className="round-head">
            <span className="hero-kicker"><Radio size={14} aria-hidden />{t("round.title")}</span>
            <h1 className="page-title" dir="auto">{r.label}</h1>
            <div className="badges">
              {r.isPrimary && <Badge tone="info">{t("round.primary")}</Badge>}
              {r.paused && <Badge tone="warning">{t("round.paused")}</Badge>}
              {r.closesAt && <Badge>{t("round.closes", { when: fmt.dateTime(r.closesAt) })}</Badge>}
              <Badge>{t("round.created", { when: fmt.dateTime(r.createdAt) })}</Badge>
            </div>
            <p className="field-label">{t("round.question")}</p>
            <p className="round-question" dir="auto">{r.prompt || <span className="muted">{t("round.noQuestion")}</span>}</p>
            <p className="field-label">{t("round.link")}</p>
            <div className="link-row">
              <Ltr className="mono link-url">{r.url}</Ltr>
              <Button variant="primary" size="sm" icon={<Copy size={14} aria-hidden />} onClick={() => void copy(r.url)}>{t("round.copy")}</Button>
              <a className="btn btn-sm btn-secondary" href={r.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden />{t("round.openLink")}</a>
            </div>
          </section>

          <div className="stat-grid five">
            <StatCard label={t("round.stat.views")} count={r.stats.views} format={fmt.number} hint={t("round.stat.viewsHint")} />
            <StatCard label={t("round.stat.messages")} count={r.stats.messages} format={fmt.number} hint={t("round.stat.messagesHint")} />
            <StatCard label={t("round.stat.replied")} count={r.stats.replied} format={fmt.number} hint={t("round.stat.repliedHint")} />
            <StatCard label={t("round.stat.reported")} count={r.stats.reported} format={fmt.number} hint={t("round.stat.reportedHint")} tone={r.stats.reported > 0 ? "warning" : undefined} />
            <StatCard label={t("round.stat.filtered")} count={r.stats.filtered} format={fmt.number} hint={t("round.stat.filteredHint")} />
          </div>

          <div className="two-col">
            <Card title={t("round.owner")}>
              <p className="muted small section-hint">{t("round.ownerHint")}</p>
              <OwnerBlock owner={r.owner} />
            </Card>
            <Card title={t("round.daily")}>
              <p className="muted small section-hint">{t("round.dailyHint")}</p>
              {r.daily.length === 0 ? <p className="muted">{t("round.noDaily")}</p> : (
                <TimeChart mode="line" dates={r.daily.map((d) => d.day)} series={[
                  { key: "views", label: t("round.views"), color: "var(--secondary)", values: r.daily.map((d) => d.views) },
                  { key: "messages", label: t("round.messagesSeries"), color: "var(--primary)", values: r.daily.map((d) => d.messages) }
                ]} />
              )}
            </Card>
          </div>

          <h2 className="section-title">{t("round.messages")}</h2>
          <p className="muted section-hint">{t("round.messagesHint")}</p>
          {r.messages.length === 0 ? <EmptyState title={t("round.noMessages")} hint={t("round.noMessagesHint")} /> : (
            <ul className="msg-list">
              {[...r.messages].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((m) => (
                <li key={m.id}>
                  <Card as="article" className="msg-card">
                    <div className="report-top">
                      <span className="badges">
                        <Badge tone={m.status === "inbox" ? "success" : m.status === "filtered" || m.status === "rejected" ? "danger" : "neutral"}>{te("status", m.status)}</Badge>
                        {m.reported && <Badge tone="danger"><Flag size={12} aria-hidden />&nbsp;{t("round.reportedFlag")}</Badge>}
                        {m.channel ? <Badge tone="info">{t("round.channel")}: <Ltr>{m.channel}</Ltr></Badge> : null}
                        {m.filteredCategories.length > 0 && <Badge tone="warning"><ShieldAlert size={12} aria-hidden />&nbsp;{t("round.filteredFlag", { categories: m.filteredCategories.map((c) => te("category", c)).join(", ") })}</Badge>}
                      </span>
                      <time className="muted small" dateTime={m.createdAt}>{fmt.dateTime(m.createdAt)}</time>
                    </div>
                    <blockquote className="msg-body" dir="auto">{m.body}</blockquote>
                    {m.replyText ? (
                      <div className="reply">
                        <p className="reply-head">{t("round.reply")} · <span className="reply-vis">{m.replyPublic ? <><Globe size={13} aria-hidden /> {t("round.replyPublic")}</> : <><Lock size={13} aria-hidden /> {t("round.replyPrivate")}</>}</span>{m.repliedAt && <span className="muted"> · {t("round.repliedAt", { when: fmt.relative(m.repliedAt) })}</span>}</p>
                        <p dir="auto" className="reply-body">{m.replyText}</p>
                      </div>
                    ) : <p className="muted small">{t("round.noReply")}</p>}
                    {m.hasEvidence && user?.role === "admin" && <Evidence messageId={m.id} />}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
