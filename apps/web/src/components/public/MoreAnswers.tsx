"use client";

import { useState } from "react";
import type { AnswerDto } from "@unsaid/shared";
import { Button } from "@/components/ui";
import { AnswerCard } from "./AnswerCard";

export function MoreAnswers({ username, initialCursor }: { username: string; initialCursor: string }) {
  const [items, setItems] = useState<AnswerDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function more() {
    if (!cursor) return;
    setBusy(true);
    setError(null);
    try {
      const [{ api }, { errorMessage }] = await Promise.all([import("@/lib/api"), import("@/lib/errors")]);
      const page = await api.profile.answers(username, cursor);
      setItems((l) => [...l, ...page.items]);
      setCursor(page.nextCursor);
    } catch (e) { setError((await import("@/lib/errors")).errorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <>
      {items.map((a) => <AnswerCard key={a.id} answer={a} />)}
      {error && <p role="alert" className="text-center text-sm text-danger">{error}</p>}
      {cursor && <div className="text-center"><Button variant="secondary" loading={busy} onClick={more}>Load more answers</Button></div>}
    </>
  );
}
