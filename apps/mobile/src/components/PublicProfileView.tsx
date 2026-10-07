import { Badge } from "@/components/Badge";
import { useState } from "react";
import { Linking, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@unsaid/api-client";
import { LIMITS, type ChallengeDto, type PublicProfileDto } from "@unsaid/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { haptic } from "@/lib/haptics";
import { remainingChars } from "@/lib/format";
import { solvePow } from "@/lib/pow";
import { validateMessage } from "@/lib/validation";
import { useAuth } from "@/providers/AuthProvider";
import { useNetwork } from "@/providers/NetworkProvider";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";
import { ErrorBanner, ErrorState } from "./ErrorState";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { Screen } from "./Screen";
import { SkeletonList } from "./Skeleton";
import { Text } from "./Text";
import { Textarea } from "./Input";
import { useRequest } from "@/lib/hooks";
import { isolate, useT } from "@/i18n";

type Target = { kind: "u"; username: string } | { kind: "l"; slug: string };
type Outcome = null | "sent" | "paused" | "closed" | "rejected" | "rate_limited";

export function PublicProfileView({ target }: { target: Target }) {
  const router = useRouter();
  const { t } = useT();
  const { status } = useAuth();
  const { report } = useNetwork();
  const profile = useRequest<PublicProfileDto>(() => (target.kind === "u" ? api.profile.get(target.username) : api.profile.getByLink(target.slug)), [target.kind === "u" ? target.username : target.slug]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"idle" | "verifying" | "sending">("idle");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [retryIn, setRetryIn] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectMsg, setRejectMsg] = useState<string | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace(status === "authed" ? "/inbox" : "/welcome"));

  const send = async () => {
    const v = validateMessage(text);
    if (!v.ok) { setError(v.error); return; }
    setError(null); setBusy("sending");
    const base = target.kind === "u" ? { username: target.username } : { slug: target.slug };
    try {
      try {
        await api.messages.send({ ...base, body: v.value });
      } catch (e) {
        if (e instanceof ApiError && e.code === "challenge_required") {
          const ch = (e.details as { challenge?: ChallengeDto } | undefined)?.challenge ?? (await api.messages.challenge());
          setBusy("verifying");
          const solution = await solvePow(ch);
          setBusy("sending");
          await api.messages.send({ ...base, body: v.value, challenge: solution });
        } else throw e;
      }
      haptic.success(); setText(""); setRejectMsg(null); setOutcome("sent");
    } catch (e) {
      report(e); haptic.error();
      if (e instanceof ApiError) {
        if (e.code === "link_paused" || e.code === "account_suspended") {
          // The API message is localised, so don't pattern-match it: re-read the link state to tell "closed" from "paused".
          setOutcome("paused");
          void profile.refresh();
        }
        else if (e.code === "moderation_rejected") { setRejectMsg(e.message || null); setOutcome("rejected"); }
        else if (e.code === "rate_limited") { setRetryIn(e.retryAfterSeconds ?? null); setOutcome("rate_limited"); }
        else if (e.code === "not_found") setError(t("publicProfile.linkGone"));
        else setError(errorMessage(e));
      } else setError(errorMessage(e));
    }
    setBusy("idle");
  };

  const header = (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginStart: -8 }}>
      <IconButton icon="chevron" dir="back" label={t("common.back")} onPress={back} filled />
    </View>
  );

  if (profile.loading) return <Screen>{header}<SkeletonList count={2} /></Screen>;
  if (profile.error || !profile.data) {
    const notFound = profile.error === t("errors.notFound");
    return (
      <Screen>
        {header}
        {notFound ? <EmptyState icon="link" title={t("publicProfile.linkNotFoundTitle")} body={t("publicProfile.linkNotFoundBody")} actionLabel={t("publicProfile.getOwn")} onAction={() => router.replace("/welcome")} /> : <ErrorState message={profile.error ?? t("publicProfile.tryAgainFallback")} onRetry={profile.reload} />}
      </Screen>
    );
  }
  const p = profile.data;
  const closed = p.linkState === "closed" || outcome === "closed";
  const paused = p.linkState === "paused" || (!p.acceptingMessages && !closed) || outcome === "paused";
  const left = remainingChars(text, LIMITS.messageMax);

  return (
    <Screen>
      {header}
      <View style={{ alignItems: "center", gap: 8 }}>
        <Avatar name={p.displayName || p.username} uri={p.avatarUrl} size={84} frame={p.avatarFrame} />
        <Text variant="title">{p.displayName || p.username}</Text>
        <Text tone="muted">{isolate(`@${p.username}`)}</Text>
        {p.linkLabel ? <Badge label={t("publicProfile.roundBadge", { kind: closed ? t("publicProfile.roundClosed") : t("publicProfile.anonymousRound"), label: p.linkLabel })} tone="secondary" /> : null}
        {p.bio ? <Text style={{ textAlign: "center" }}>{p.bio}</Text> : null}
        {p.whatsapp && /^[0-9]{7,15}$/.test(p.whatsapp) ? (
          <Button title={t("publicProfile.whatsappChat")} small variant="secondary" icon={<Icon name="chat" size={18} tone="success" />} onPress={() => { void Linking.openURL(`https://wa.me/${p.whatsapp}`).catch(() => undefined); }} />
        ) : null}
      </View>

      {outcome === "sent" ? (
        <Card style={{ alignItems: "center", gap: 10 }} accessibilityLiveRegion="polite">
          <Icon name="check" size={36} tone="success" />
          <Text variant="heading">{t("publicProfile.sentTitle")}</Text>
          <Text tone="muted" style={{ textAlign: "center" }}>{t("publicProfile.sentBody", { username: `@${p.username}` })}</Text>
          <Button title={t("publicProfile.sendAnother")} variant="secondary" small onPress={() => setOutcome(null)} />
          {status !== "authed" ? <Button title={t("publicProfile.getYourOwn")} small onPress={() => router.push("/signup")} /> : null}
        </Card>
      ) : closed ? (
        <EmptyState icon="pause" title={t("publicProfile.closedTitle")} body={t("publicProfile.closedBody", { username: `@${p.username}` })} />
      ) : paused ? (
        <EmptyState icon="pause" title={t("publicProfile.pausedTitle")} body={t("publicProfile.pausedBody", { username: `@${p.username}` })} />
      ) : outcome === "rate_limited" ? (
        <Card style={{ gap: 10 }} accessibilityRole="alert">
          <Text variant="heading">{t("publicProfile.slowTitle")}</Text>
          <Text tone="muted">{t("publicProfile.slowBody")} {retryIn ? (retryIn > 90 ? t("publicProfile.retryMinutes", { count: Math.ceil(retryIn / 60) }) : t("publicProfile.retrySeconds", { count: retryIn })) : t("publicProfile.retryLater")}</Text>
          <Button title={t("publicProfile.backToMessage")} variant="secondary" small onPress={() => setOutcome(null)} />
        </Card>
      ) : outcome === "rejected" ? (
        <Card style={{ gap: 10 }} accessibilityRole="alert">
          <Text variant="heading">{t("publicProfile.rejectedTitle")}</Text>
          <Text tone="muted">{rejectMsg ?? t("publicProfile.rejectedBody")}</Text>
          <Button title={t("publicProfile.editMessage")} variant="secondary" small onPress={() => setOutcome(null)} />
        </Card>
      ) : (
        <>
          {error ? <ErrorBanner message={error} /> : null}
          <Textarea
            label={p.prompt || t("publicProfile.defaultLabel")} value={text} onChangeText={(t) => { setText(t); if (error) setError(null); }}
            placeholder={t("publicProfile.placeholder")} max={LIMITS.messageMax} maxLength={LIMITS.messageMax + 50} accessibilityHint={t("common.charsLeft", { count: left })}
          />
          <Text variant="caption" tone="muted"><Icon name="lock" size={12} tone="muted" /> {t("publicProfile.anonymousNote", { name: p.displayName || p.username })}</Text>
          <Button title={busy === "verifying" ? t("publicProfile.verifying") : t("publicProfile.send")} onPress={send} loading={busy !== "idle"} disabled={text.trim().length < LIMITS.messageMin || left < 0} icon={busy === "idle" ? <Icon name="send" size={18} color="#fff" /> : undefined} />
        </>
      )}
    </Screen>
  );
}
