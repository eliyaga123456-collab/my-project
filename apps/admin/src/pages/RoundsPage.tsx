import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Eye, MessageSquareText, Search, User } from "lucide-react";
import { client } from "../lib/client";
import { useAsync } from "../lib/hooks";
import { useT } from "../i18n";
import { Badge, EmptyState, ErrorState, Ltr, PageHeader, SkeletonRows } from "../ui";

/** All rounds, newest first, as big tappable cards. */
export function RoundsPage() {
  const { t, fmt } = useT();
  const { data, error, reload } = useAsync(() => client.admin.activity(), []);
  const [q, setQ] = useState("");
  const rounds = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...(data?.rounds ?? [])]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .filter((r) => !needle || `${r.label} ${r.prompt ?? ""} ${r.ownerUsername} ${r.ownerEmail}`.toLowerCase().includes(needle));
  }, [data, q]);

  return (
    <>
      <PageHeader title={t("rounds.title")} subtitle={t("rounds.subtitle")} />
      <div className="toolbar">
        <label className="search">
          <Search size={16} aria-hidden />
          <span className="sr-only">{t("rounds.searchLabel")}</span>
          <input className="input" type="search" placeholder={t("rounds.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {data && <span className="muted small toolbar-count">{t("rounds.count", { n: fmt.number(rounds.length) })}</span>}
      </div>
      {error && !data ? <ErrorState message={error} onRetry={() => reload()} /> : !data ? <SkeletonRows rows={4} label={t("rounds.loading")} /> : rounds.length === 0 ? (
        <EmptyState title={q ? t("rounds.emptyFiltered") : t("rounds.empty")} hint={q ? undefined : t("rounds.emptyHint")} />
      ) : (
        <ul className="round-list">
          {rounds.map((r) => (
            <li key={r.id}>
              <Link to={`/rounds/${r.id}`} className="round-card">
                <div className="round-card-top">
                  <strong className="round-name" dir="auto">{r.label}</strong>
                  <span className="badges">{r.paused && <Badge tone="warning">{t("rounds.paused")}</Badge>}</span>
                  <ChevronRight className="icon-dir chev" size={20} aria-hidden />
                </div>
                {r.prompt ? <p className="round-prompt" dir="auto">{r.prompt}</p> : null}
                <p className="round-owner"><User size={14} aria-hidden /> <span className="muted">{t("rounds.owner")}:</span> <Ltr>@{r.ownerUsername}</Ltr></p>
                <div className="round-nums">
                  <span><Eye size={16} aria-hidden /><b>{fmt.number(r.views)}</b> {t("rounds.views")}</span>
                  <span><MessageSquareText size={16} aria-hidden /><b>{fmt.number(r.messages)}</b> {t("rounds.messages")}</span>
                  <time className="muted small" dateTime={r.createdAt}>{fmt.relative(r.createdAt)}</time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
