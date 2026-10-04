"use client";

import { useEffect, useState } from "react";
import type { BlockDto } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useT } from "@/i18n/client";
import { timeAgoT } from "@/lib/format";
import { Button, EmptyState, ErrorState, Skeleton, useToast } from "@/components/ui";
import { SettingsCard } from "./parts";

export function BlockedSection() {
  const tr = useT();
  const { t } = tr;
  const toast = useToast();
  const [items, setItems] = useState<BlockDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => { setError(null); api.blocks.list().then((r) => setItems(r.items), (e) => setError(errorMessage(e, t("public.errors.generic")))); };
  useEffect(load, []);

  async function unblock(b: BlockDto) {
    const prev = items;
    setItems((l) => l?.filter((x) => x.id !== b.id) ?? l);
    try { await api.blocks.remove(b.id); toast.success(t("app.settings.blocked.unblocked")); } catch (e) { setItems(prev); toast.error(errorMessage(e, t("public.errors.generic"))); }
  }

  return (
    <SettingsCard id="s-blocked" title={t("app.settings.blocked.title")} description={t("app.settings.blocked.body")}>
      {error && <ErrorState title={t("common.state.error")} message={error} retryLabel={t("common.state.retry")} onRetry={load} />}
      {!items && !error && <Skeleton className="h-14 w-full" />}
      {items && items.length === 0 && <EmptyState title={t("app.settings.blocked.emptyTitle")} description={t("app.settings.blocked.emptyBody")} className="py-8" />}
      {items && items.length > 0 && (
        <ul className="divide-y divide-line">
          {items.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0"><p className="font-medium">{b.label}</p><p className="text-xs text-muted">{t("app.settings.blocked.blockedAgo", { time: timeAgoT(b.createdAt, tr) })}</p></div>
              <Button size="sm" variant="outline" onClick={() => unblock(b)}>{t("app.settings.blocked.unblock")}<span className="sr-only"> {b.label}</span></Button>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}
