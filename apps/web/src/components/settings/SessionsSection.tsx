"use client";

import { useEffect, useState } from "react";
import { Laptop } from "lucide-react";
import type { SessionDto } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { shortUserAgent, timeAgo } from "@/lib/format";
import { Badge, Button, ErrorState, Skeleton, useToast } from "@/components/ui";
import { SettingsCard } from "./parts";

export function SessionsSection() {
  const toast = useToast();
  const [items, setItems] = useState<SessionDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => { setError(null); api.auth.sessions().then((r) => setItems(r.items), (e) => setError(errorMessage(e))); };
  useEffect(load, []);

  async function revoke(s: SessionDto) {
    const prev = items;
    setItems((l) => l?.filter((x) => x.id !== s.id) ?? l);
    try { await api.auth.revokeSession(s.id); toast.success("Session signed out"); } catch (e) { setItems(prev); toast.error(errorMessage(e)); }
  }

  return (
    <SettingsCard id="s-sessions" title="Active sessions" description="Where you're signed in. Sign out of anything you don't recognise.">
      {error && <ErrorState message={error} onRetry={load} />}
      {!items && !error && <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>}
      {items && (
        <ul className="divide-y divide-line">
          {items.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <Laptop className="size-5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">{shortUserAgent(s.userAgent)}{s.current && <Badge tone="success">This device</Badge>}</p>
                <p className="text-xs text-muted">Active {timeAgo(s.lastUsedAt)} · signed in {timeAgo(s.createdAt)}</p>
              </div>
              {!s.current && <Button size="sm" variant="outline" onClick={() => revoke(s)}>Sign out</Button>}
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}
