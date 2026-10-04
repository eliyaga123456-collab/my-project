import { Badge } from "@/components/Badge";
import { useState } from "react";
import { View } from "react-native";
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

type Target = { kind: "u"; username: string } | { kind: "l"; slug: string };
type Outcome = null | "sent" | "paused" | "closed" | "rejected" | "rate_limited";

export function PublicProfileView({ target }: { target: Target }) {
  const router = useRouter();
  const { status } = useAuth();
  const { report } = useNetwork();
  const profile = useRequest<PublicProfileDto>(() => (target.kind === "u" ? api.profile.get(target.username) : api.profile.getByLink(target.slug)), [target.kind === "u" ? target.username : target.slug]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"idle" | "verifying" | "sending">("idle");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [retryIn, setRetryIn] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      haptic.success(); setText(""); setOutcome("sent");
    } catch (e) {
      report(e); haptic.error();
      if (e instanceof ApiError) {
        if (e.code === "link_paused" || e.code === "account_suspended") { setOutcome(/round has closed/i.test(e.message) ? "closed" : "paused"); }
        else if (e.code === "moderation_rejected") setOutcome("rejected");
        else if (e.code === "rate_limited") { setRetryIn(e.retryAfterSeconds ?? null); setOutcome("rate_limited"); }
        else if (e.code === "not_found") setError("This link no longer exists.");
        else setError(errorMessage(e));
      } else setError(errorMessage(e));
    }
    setBusy("idle");
  };

  const header = (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginLeft: -8 }}>
      <IconButton icon="chevron" label="Back" onPress={back} style={{ transform: [{ scaleX: -1 }] }} filled />
    </View>
  );

  if (profile.loading) return <Screen>{header}<SkeletonList count={2} /></Screen>;
  if (profile.error || !profile.data) {
    const notFound = profile.error === "We couldn't find that.";
    return (
      <Screen>
        {header}
        {notFound ? <EmptyState icon="link" title="Link not found" body="This link doesn't exist, was renamed, or the account is gone." actionLabel="Get your own EAR" onAction={() => router.replace("/welcome")} /> : <ErrorState message={profile.error ?? "Try again"} onRetry={profile.reload} />}
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
        <Avatar name={p.displayName || p.username} uri={p.avatarUrl} size={84} />
        <Text variant="title">{p.displayName || p.username}</Text>
        <Text tone="muted">@{p.username}</Text>
        {p.linkLabel ? <Badge label={`${closed ? "Round closed" : "Anonymous round"} · ${p.linkLabel}`} tone="secondary" /> : null}
        {p.bio ? <Text style={{ textAlign: "center" }}>{p.bio}</Text> : null}
      </View>

      {outcome === "sent" ? (
        <Card style={{ alignItems: "center", gap: 10 }} accessibilityLiveRegion="polite">
          <Icon name="check" size={36} tone="success" />
          <Text variant="heading">Sent anonymously</Text>
          <Text tone="muted" style={{ textAlign: "center" }}>@{p.username} will see your message, but not who sent it.</Text>
          <Button title="Send another" variant="secondary" small onPress={() => setOutcome(null)} />
          {status !== "authed" ? <Button title="Get your own link" small onPress={() => router.push("/signup")} /> : null}
        </Card>
      ) : closed ? (
        <EmptyState icon="pause" title="This round has closed" body={`@${p.username} stopped collecting messages here. Thanks for stopping by!`} />
      ) : paused ? (
        <EmptyState icon="pause" title="Not taking messages right now" body={`@${p.username} has paused this link. Try again later.`} />
      ) : outcome === "rate_limited" ? (
        <Card style={{ gap: 10 }} accessibilityRole="alert">
          <Text variant="heading">Slow down a little</Text>
          <Text tone="muted">You've sent a lot of messages recently.{retryIn ? ` Try again in about ${retryIn > 90 ? `${Math.ceil(retryIn / 60)} minutes` : `${retryIn} seconds`}.` : " Please try again in a bit."}</Text>
          <Button title="Back to message" variant="secondary" small onPress={() => setOutcome(null)} />
        </Card>
      ) : outcome === "rejected" ? (
        <Card style={{ gap: 10 }} accessibilityRole="alert">
          <Text variant="heading">That message wasn't sent</Text>
          <Text tone="muted">It broke our community rules (harassment, threats, personal info and the like). Nothing was delivered. Rephrase it kindly and try again.</Text>
          <Button title="Edit message" variant="secondary" small onPress={() => setOutcome(null)} />
        </Card>
      ) : (
        <>
          {error ? <ErrorBanner message={error} /> : null}
          <Textarea
            label={p.prompt || "Send me an anonymous message"} value={text} onChangeText={(t) => { setText(t); if (error) setError(null); }}
            placeholder="Write something…" max={LIMITS.messageMax} maxLength={LIMITS.messageMax + 50} accessibilityHint={`${left} characters left`}
          />
          <Text variant="caption" tone="muted"><Icon name="lock" size={12} tone="muted" /> Anonymous — {p.displayName || p.username} can't see who you are. Be kind.</Text>
          <Button title={busy === "verifying" ? "Verifying you're human…" : "Send anonymously"} onPress={send} loading={busy !== "idle"} disabled={text.trim().length < LIMITS.messageMin || left < 0} icon={busy === "idle" ? <Icon name="send" size={18} color="#fff" /> : undefined} />
        </>
      )}
    </Screen>
  );
}
