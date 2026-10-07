import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Eye, MessageSquareText } from "lucide-react";
import { client } from "../lib/client";
import { useAsync } from "../lib/hooks";
import { useT } from "../i18n";
import { Badge, Card, EmptyState, ErrorState, Ltr, OwnerBlock, Skeleton, StatCard } from "../ui";

export function UserDetail() {
  const { id = "" } = useParams();
  const { t, te, fmt } = useT();
  const u = useAsync(() => client.admin.user(id), [id]);
  const act = useAsync(() => client.admin.activity(), []);
  const user = u.data;
  const rounds = (act.data?.rounds ?? []).filter((r) => user && r.ownerUsername === user.username).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <>
      <Link to="/users" className="back-link"><ArrowLeft className="icon-dir" size={16} aria-hidden />{t("nav.users")}</Link>
      {u.error && !user ? <ErrorState title={t("user.notFound")} message={u.error} onRetry={() => u.reload()} /> : !user ? <Skeleton height={160} radius={16} /> : (
        <>
          <section className="round-head">
            <span className="hero-kicker">{t("user.title")}</span>
            <h1 className="page-title" dir="auto">{user.displayName || user.username}</h1>
            <div className="badges">
              <Badge tone="info">{te("role", user.role)}</Badge>
              {!user.emailVerified && <Badge>{t("common.unverified")}</Badge>}
              <Badge>{t("users.drawer.joined")}: {fmt.date(user.createdAt)}</Badge>
              <Badge>{t("users.drawer.lastSeen")}: {fmt.relative(user.lastSeenAt)}</Badge>
            </div>
          </section>
          <div className="stat-grid">
            <StatCard label={t("users.drawer.messages")} value={fmt.number(user.messagesReceived)} />
            <StatCard label={t("users.drawer.reportsFiled")} value={fmt.number(user.reportsFiled)} />
          </div>
          <div className="two-col">
            <Card title={t("user.contact")}><OwnerBlock owner={user} profileLink={false} /></Card>
            <Card title={t("user.about")}>
              <p className="muted small">{t("user.manage")}</p>
              <p><Link className="btn btn-secondary" to="/users">{t("nav.users")}</Link></p>
              <p className="muted small">{t("users.drawer.id")}: <Ltr className="mono">{user.id}</Ltr></p>
            </Card>
          </div>
          <h2 className="section-title">{t("user.rounds")}</h2>
          {!act.data ? <Skeleton height={80} radius={14} /> : rounds.length === 0 ? <EmptyState title={t("user.noRounds")} /> : (
            <ul className="round-list">
              {rounds.map((r) => (
                <li key={r.id}>
                  <Link to={`/rounds/${r.id}`} className="round-card">
                    <strong className="round-name" dir="auto">{r.label}</strong>
                    {r.prompt ? <p className="round-prompt" dir="auto">{r.prompt}</p> : null}
                    <div className="round-nums">
                      <span><Eye size={16} aria-hidden /><b>{fmt.number(r.views)}</b> {t("rounds.views")}</span>
                      <span><MessageSquareText size={16} aria-hidden /><b>{fmt.number(r.messages)}</b> {t("rounds.messages")}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
