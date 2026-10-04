"use client";

import { useEffect, useState } from "react";
import type { BlockDto } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/format";
import { Button, EmptyState, ErrorState, Skeleton, useToast } from "@/components/ui";
import { SettingsCard } from "./parts";

export function BlockedSection() {
  const toast = useToast();
  const [items, setItems] = useState<BlockDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => { setError(null); api.blocks.list().then((r) => setItems(r.items), (e) => setError(errorMessage(e))); };
  useEffect(load, []);

  async function unblock(b: BlockDto) {
    const prev = items;
    setItems((l) => l?.filter((x) => x.id !== b.id) ?? l);
    try { await api.blocks.remove(b.id); toast.success("Unblocked"); } catch (e) { setItems(prev); toast.error(errorMessage(e)); }
  }

  return (
    <SettingsCard id="s-blocked" title="Blocked sources" description="Anonymous sources you've blocked. Labels are random. They never reveal who someone is.">
      {error && <ErrorState message={error} onRetry={load} />}
      {!items && !error && <Skeleton className="h-14 w-full" />}
      {items && items.length === 0 && <EmptyState title="No one is blocked" description="Block a sender from any message in your inbox." className="py-8" />}
      {items && items.length > 0 && (
        <ul className="divide-y divide-line">
          {items.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0"><p className="font-medium">{b.label}</p><p className="text-xs text-muted">Blocked {timeAgo(b.createdAt)}</p></div>
              <Button size="sm" variant="outline" onClick={() => unblock(b)}>Unblock<span className="sr-only"> {b.label}</span></Button>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}
