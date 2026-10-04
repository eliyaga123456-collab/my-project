"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, PauseCircle, ShieldCheck, Sparkles } from "lucide-react";
import type { ChallengeDto } from "@unsaid/shared";
import { LIMITS } from "@/lib/limits";
import { Button, ButtonLink, TextareaField } from "@/components/ui";
import { useT } from "@/i18n/client";
import { isolateIn } from "@/i18n/format";
import { rich } from "@/lib/rich";

export type SendTarget = { username: string } | { slug: string };

type Phase = "idle" | "sending" | "verifying" | "sent" | "paused" | "closed" | "missing";

/** zod + the API client are only needed once someone sends; keep them out of the first-load bundle. */
const loadSender = () => Promise.all([import("@unsaid/shared"), import("@unsaid/api-client"), import("@/lib/api"), import("@/lib/errors")]);

function isChallenge(v: unknown): v is ChallengeDto {
  return !!v && typeof v === "object" && typeof (v as ChallengeDto).prefix === "string" && typeof (v as ChallengeDto).id === "string" && typeof (v as ChallengeDto).difficulty === "number";
}

export function SendForm({ target, displayName: rawName, initiallyPaused, initiallyClosed = false }: { target: SendTarget; displayName: string; initiallyPaused: boolean; initiallyClosed?: boolean }) {
  const tr = useT();
  const { t, locale } = tr;
  const displayName = isolateIn(locale, rawName);
  const [body, setBody] = useState("");
  const [phase, setPhase] = useState<Phase>(initiallyClosed ? "closed" : initiallyPaused ? "paused" : "idle");
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
    const [{ messageBodySchema }, { solveChallenge, webSha256 }, { api }, { classifySendError, isApiError }] = await loadSender();
    const parsed = messageBodySchema.safeParse(body);
    if (!parsed.success) { setError(Array.from(body.trim()).length > LIMITS.messageMax ? t("public.send.tooLong", { max: LIMITS.messageMax }) : t("public.send.tooShort")); area.current?.focus(); return; }
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
      const f = classifySendError(err, tr);
      if (f.kind === "paused") { setPhase(isApiError(err) && /round has closed|הסבב הזה נסגר/i.test(err.message) ? "closed" : "paused"); return; }
      if (f.kind === "not_found") { setPhase("missing"); return; }
      setPhase("idle");
      if (f.kind === "rejected") setNotice(f.message);
      else setError(f.message);
    }
  }

  if (phase === "closed") {
    return (
      <div role="status" className="rounded-lg border border-line bg-raised/50 p-6 text-center animate-ink-in">
        <PauseCircle className="mx-auto size-9 text-muted" aria-hidden />
        <h2 className="mt-3 text-xl font-bold">{t("public.send.closedTitle")}</h2>
        <p className="mt-1 text-muted">{t("public.send.closedBody", { name: displayName })}</p>
        <div className="mt-5"><ButtonLink href="/install">{t("public.send.startRound")}</ButtonLink></div>
      </div>
    );
  }
  if (phase === "paused") {
    return (
      <div role="status" className="rounded-lg border border-line bg-raised/50 p-6 text-center animate-ink-in">
        <PauseCircle className="mx-auto size-9 text-muted" aria-hidden />
        <h2 className="mt-3 text-xl font-bold">{t("public.send.pausedTitle", { name: displayName })}</h2>
        <p className="mt-1 text-muted">{t("public.send.pausedBody")}</p>
      </div>
    );
  }
  if (phase === "missing") {
    return (
      <div role="alert" className="rounded-lg border border-line bg-raised/50 p-6 text-center">
        <h2 className="text-xl font-bold">{t("public.send.missingTitle")}</h2>
        <p className="mt-1 text-muted">{t("public.send.missingBody")}</p>
      </div>
    );
  }
  if (phase === "sent") {
    return (
      <div role="status" className="rounded-lg border border-success/40 bg-success/10 p-6 text-center animate-ink-in">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h2 className="mt-3 text-2xl font-extrabold">{t("public.send.sentTitle")}</h2>
        <p className="mx-auto mt-1 max-w-sm text-muted">{t("public.send.sentBody", { name: displayName })}</p>
        <div className="mt-5 flex flex-col justify-center gap-2 xs:flex-row">
          <Button variant="secondary" onClick={() => { setPhase("idle"); setTimeout(() => area.current?.focus(), 0); }}>{t("public.send.sendAnother")}</Button>
          <ButtonLink href="/install">{t("public.send.getLink")}</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <TextareaField
        ref={area}
        label={t("public.send.label", { name: displayName })}
        hideLabel
        placeholder={t("public.send.placeholder")}
        dir="auto"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        disabled={busy}
        error={error}
        counter={<span dir="ltr" className={near ? "font-semibold text-warning" : undefined} aria-live="polite">{len}/{LIMITS.messageMax}</span>}
        enterKeyHint="send"
        onFocus={() => void loadSender()}
      />
      {notice && <p role="alert" className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">{notice}</p>}
      {phase === "verifying" && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> {t("public.send.verifying")}</p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={busy} leading={<Sparkles className="size-4" aria-hidden />}>{t("public.send.submit")}</Button>
      <p className="flex items-start gap-2 text-[0.82rem] text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        <span>{rich(t("public.send.kind", { name: displayName }), { link: (c) => <Link href="/privacy" className="underline">{c}</Link> })}</span>
      </p>
    </form>
  );
}
