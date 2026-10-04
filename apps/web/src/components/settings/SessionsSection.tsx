"use client";

import { useEffect, useState } from "react";
import { Laptop } from "lucide-react";
import type { SessionDto } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useT } from "@/i18n/client";
import { shortUserAgent, timeAgoT } from "@/lib/format";
import { Badge, Button, ErrorState, Skeleton, useToast } from "@/components/ui";
import { SettingsCard } from "./parts";

export function SessionsSection() {
  const tr = useT();
  const { t } = tr;
  const toast = useToast();
  const [items, setItems] = useState<SessionDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => { setError(null); api.auth.sessions().then((r) => setItems(r.items), (e) => setError(errorMessage(e, t("public.errors.generic")))); };
  useEffect(load, []);

  async function revoke(s: SessionDto) {
    const prev = items;
    setItems((l) => l?.filter((x) => x.id !== s.id) ?? l);
    try { await api.auth.revokeSession(s.id); toast.success(t("app.settings.sessions.signedOut")); } catch (e) { setItems(prev); toast.error(errorMessage(e, t("public.errors.generic"))); }
  }

  return (
    <SettingsCard id="s-sessions" title={t("app.settings.sessions.title")} description={t("app.settings.sessions.body")}>
      {error && <ErrorState title={t("common.state.error")} message={error} retryLabel={t("common.state.retry")} onRetry={load} />}
      {!items && !error && <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>}
      {items && (
        <ul className="divide-y divide-line">
          {items.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <Laptop className="size-5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">{shortUserAgent(s.userAgent, tr)}{s.current && <Badge tone="success">{t("app.settings.sessions.thisDevice")}</Badge>}</p>
                <p className="text-xs text-muted">{t("app.settings.sessions.activity", { active: timeAgoT(s.lastUsedAt, tr), signed: timeAgoT(s.createdAt, tr) })}</p>
              </div>
              {!s.current && <Button size="sm" variant="outline" onClick={() => revoke(s)}>{t("app.settings.sessions.signOut")}</Button>}
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}
