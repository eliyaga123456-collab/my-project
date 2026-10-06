import { useEffect, useState } from "react";
import type { AdminActivityDto } from "@unsaid/shared";
import { client, errorMessage } from "../lib/client";
import { useT } from "../i18n";
import { Card, EmptyState, ErrorState, Ltr, PageHeader, SkeletonRows } from "../ui";

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
          {data.rounds.length === 0 ? <EmptyState title={t("activity.empty")} /> : data.rounds.map((r) => (
            <Card as="article" key={r.id}>
              <strong dir="auto">{r.label}</strong>{r.prompt ? <p dir="auto" className="muted">{r.prompt}</p> : null}
              <p className="small muted">{t("activity.owner")}: <Ltr>@{r.ownerUsername}</Ltr> · <Ltr>{r.ownerEmail}</Ltr> · <time dateTime={r.createdAt}>{fmt.dateTime(r.createdAt)}</time> · {t("activity.views")}: {r.views} · {t("activity.messages")}: {r.messages}</p>
            </Card>
          ))}
          <h2>{t("activity.signups")}</h2>
          {data.signups.map((s) => (
            <Card as="article" key={s.id}><p className="small"><strong><Ltr>@{s.username}</Ltr></strong> · <Ltr>{s.email}</Ltr> · <time dateTime={s.createdAt}>{fmt.dateTime(s.createdAt)}</time> · {s.status}</p></Card>
          ))}
        </div>
      )}
    </>
  );
}
