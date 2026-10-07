import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AdminActivityDto } from "@unsaid/shared";
import { client, errorMessage } from "../lib/client";
import { useT } from "../i18n";
import { ChevronRight, Eye, MessageSquareText, Radio, UserPlus } from "lucide-react";
import { EmptyState, ErrorState, Ltr, PageHeader, SkeletonRows, StatusBadge } from "../ui";

export function ActivityPage() {
  const { t, fmt } = useT();
  const [data, setData] = useState<AdminActivityDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => { setError(null); client.admin.activity().then(setData, (e) => setError(errorMessage(e))); };
  useEffect(load, []);
  return (
    <>
      <PageHeader title={t("nav.activity")} subtitle={t("activity.subtitle")} />
      {error ? <ErrorState message={error} onRetry={load} /> : !data ? <SkeletonRows label={t("common.loading")} /> : (
        <div className="stack">
          {data.rounds.length === 0 ? <EmptyState title={t("activity.empty")} /> : data.rounds.slice(0, 10).map((r, i) => (
            <Link key={r.id} to={`/rounds/${r.id}`} className="act-row" style={{ "--i": i } as React.CSSProperties}>
              <span className="act-icon" aria-hidden><Radio size={20} /></span>
              <span className="act-main">
                <strong dir="auto">{r.label}</strong>
                {r.prompt ? <span dir="auto" className="act-prompt">{r.prompt}</span> : null}
                <span className="act-meta"><Ltr>@{r.ownerUsername}</Ltr><time dateTime={r.createdAt}>{fmt.relative(r.createdAt)}</time><span><Eye size={13} aria-hidden /> {fmt.number(r.views)}</span><span><MessageSquareText size={13} aria-hidden /> {fmt.number(r.messages)}</span></span>
              </span>
              <ChevronRight className="icon-dir act-chev" size={18} aria-hidden />
            </Link>
          ))}
          {data.rounds.length > 10 && <Link className="btn btn-secondary" to="/rounds">{t("common.seeAll")} ({data.rounds.length})</Link>}
          <h2 className="section-title">{t("activity.signups")}</h2>
          {data.signups.map((s, i) => (
            <Link key={s.id} to={`/users/${s.id}`} className="act-row" style={{ "--i": i } as React.CSSProperties}>
              <span className="act-icon" aria-hidden><UserPlus size={20} /></span>
              <span className="act-main">
                <strong><Ltr>@{s.username}</Ltr></strong>
                <span className="act-meta"><Ltr>{s.email}</Ltr><time dateTime={s.createdAt}>{fmt.relative(s.createdAt)}</time></span>
              </span>
              <StatusBadge status={s.status} />
              <ChevronRight className="icon-dir act-chev" size={18} aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
