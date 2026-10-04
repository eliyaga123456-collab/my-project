"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, PauseCircle, ShieldCheck, Sparkles } from "lucide-react";
import { LIMITS, messageBodySchema, type ChallengeDto } from "@unsaid/shared";
import { solveChallenge, webSha256 } from "@unsaid/api-client";
import { api } from "@/lib/api";
import { classifySendError, isApiError } from "@/lib/errors";
import { Button, ButtonLink, TextareaField } from "@/components/ui";

export type SendTarget = { username: string } | { slug: string };

type Phase = "idle" | "sending" | "verifying" | "sent" | "paused" | "missing";

function isChallenge(v: unknown): v is ChallengeDto {
  return !!v && typeof v === "object" && typeof (v as ChallengeDto).prefix === "string" && typeof (v as ChallengeDto).id === "string" && typeof (v as ChallengeDto).difficulty === "number";
}

export function SendForm({ target, displayName, initiallyPaused }: { target: SendTarget; displayName: string; initiallyPaused: boolean }) {
  const [body, setBody] = useState("");
  const [phase, setPhase] = useState<Phase>(initiallyPaused ? "paused" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const len = Array.from(body).length;
  const near = len > LIMITS.messageMax * 0.9;
  const busy = phase === "sending" || phase === "verifying";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    const parsed = messageBodySchema.safeParse(body);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Write a little more"); area.current?.focus(); return; }
    const base = { ...target, body: parsed.data };
    setPhase("sending");
    try {
      try {
        await api.messages.send(base);
      } catch (err) {
        if (!(isApiError(err) && err.code === "challenge_required")) throw err;
        setPhase("verifying");
        const fromErr = (err.details as Record<string, unknown> | undefined)?.challenge;
        const challenge = isChallenge(fromErr) ? fromErr : await api.messages.challenge();
        const solution = await solveChallenge(challenge, webSha256);
        await api.messages.send({ ...base, challenge: solution });
      }
      setBody("");
      setPhase("sent");
    } catch (err) {
      const f = classifySendError(err);
      if (f.kind === "paused") { setPhase("paused"); return; }
      if (f.kind === "not_found") { setPhase("missing"); return; }
      setPhase("idle");
      if (f.kind === "rejected") setNotice(f.message);
      else setError(f.message);
    }
  }

  if (phase === "paused") {
    return (
      <div role="status" className="rounded-lg border border-line bg-raised/50 p-6 text-center animate-ink-in">
        <PauseCircle className="mx-auto size-9 text-muted" aria-hidden />
        <h2 className="mt-3 text-xl font-bold">{displayName} has paused messages</h2>
        <p className="mt-1 text-muted">This link isn&apos;t accepting anything right now. Check back later.</p>
      </div>
    );
  }
  if (phase === "missing") {
    return (
      <div role="alert" className="rounded-lg border border-line bg-raised/50 p-6 text-center">
        <h2 className="text-xl font-bold">This link doesn&apos;t exist anymore</h2>
        <p className="mt-1 text-muted">It may have been changed or removed.</p>
      </div>
    );
  }
  if (phase === "sent") {
    return (
      <div role="status" className="rounded-lg border border-success/40 bg-success/10 p-6 text-center animate-ink-in">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h2 className="mt-3 text-2xl font-extrabold">Sent anonymously</h2>
        <p className="mx-auto mt-1 max-w-sm text-muted">{displayName} will see your message without any sender details. If it breaks the rules, it may land in their Filtered folder.</p>
        <div className="mt-5 flex flex-col justify-center gap-2 xs:flex-row">
          <Button variant="secondary" onClick={() => { setPhase("idle"); setTimeout(() => area.current?.focus(), 0); }}>Send another</Button>
          <ButtonLink href="/signup">Get your own link</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <TextareaField
        ref={area}
        label={`Anonymous message to ${displayName}`}
        hideLabel
        placeholder="Write something..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        disabled={busy}
        error={error}
        counter={<span className={near ? "font-semibold text-warning" : undefined} aria-live="polite">{len}/{LIMITS.messageMax}</span>}
        enterKeyHint="send"
      />
      {notice && <p role="alert" className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">{notice}</p>}
      {phase === "verifying" && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> Quick check that you&apos;re not a bot…</p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={busy} leading={<Sparkles className="size-4" aria-hidden />}>Send anonymously</Button>
      <p className="flex items-start gap-2 text-[0.82rem] text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        <span>Be kind. Harassment is filtered and reportable. {displayName} won&apos;t see who you are, and <Link href="/privacy" className="underline">here&apos;s exactly how that works</Link>.</span>
      </p>
    </form>
  );
}
