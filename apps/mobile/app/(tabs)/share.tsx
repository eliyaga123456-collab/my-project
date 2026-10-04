import { useState } from "react";
import { Share, Switch, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { LinkDto } from "@unsaid/shared";
import { LIMITS } from "@unsaid/shared";
import { Badge } from "@/components/Badge";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Icon } from "@/components/Icon";
import { IconButton } from "@/components/IconButton";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { SkeletonList } from "@/components/Skeleton";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { countLabel } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { useRequest } from "@/lib/hooks";
import { useNetwork } from "@/providers/NetworkProvider";
import { useTheme } from "@/theme";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Chips } from "@/components/Chips";
import { WEB_URL } from "@/lib/env";
import { useRouter } from "expo-router";

export default function SharePage() {
  const { colors } = useTheme();
  const toast = useToast();
  const { report } = useNetwork();
  const links = useRequest(() => api.links.list().then((r) => r.items));
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [question, setQuestion] = useState("");
  const [duration, setDuration] = useState<"none" | "1" | "24" | "72" | "168">("none");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<LinkDto | null>(null);

  useFocusEffect(useCallback(() => { void links.refresh(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const items = links.data ?? [];
  const primary = items.find((l) => l.isPrimary);
  const extras = items.filter((l) => !l.isPrimary).sort((a, b) => Number(a.closed) - Number(b.closed) || b.createdAt.localeCompare(a.createdAt));
  const installUrl = `${WEB_URL}/install`;

  const replaceLink = (l: LinkDto) => links.setData((cur) => (cur ?? []).map((x) => (x.id === l.id ? l : x)));
  const guard = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.show(errorMessage(e), "error"); report(e); } setBusy(false); };

  const copy = async (l: LinkDto) => { await Clipboard.setStringAsync(l.url); haptic.success(); toast.show("Link copied", "success"); };
  const share = (l: LinkDto) => Share.share({ message: `${l.prompt ? `${l.prompt} — ` : "Send me an anonymous message: "}${l.url}` }).catch(() => undefined);
  const inviteToApp = () => Share.share({ message: `Get EAR — anonymous questions & replies: ${installUrl}` }).catch(() => undefined);
  const copyInstall = async () => { await Clipboard.setStringAsync(installUrl); haptic.success(); toast.show("Install link copied", "success"); };
  const setPaused = (l: LinkDto, paused: boolean) => guard(async () => {
    const u = l.isPrimary ? await api.links.pause(paused) : await api.links.update(l.id, { paused });
    replaceLink(u); toast.show(paused ? "Link paused" : "Link is live", "success");
  });
  const create = () => guard(async () => {
    const hours = duration === "none" ? 0 : Number(duration);
    const l = await api.links.create({ label: label.trim(), ...(question.trim() ? { prompt: question.trim() } : {}), closesAt: hours ? new Date(Date.now() + hours * 3_600_000).toISOString() : null });
    links.setData((cur) => [...(cur ?? []), l]); setLabel(""); setQuestion(""); setDuration("none"); setCreating(false); toast.show("Round started — share its link!", "success");
    void Share.share({ message: `${l.prompt ? `${l.prompt} — ` : "Send me an anonymous message: "}${l.url}` }).catch(() => undefined);
  });
  const remove = () => guard(async () => {
    if (!toDelete) return;
    await api.links.remove(toDelete.id);
    links.setData((cur) => (cur ?? []).filter((x) => x.id !== toDelete.id)); setToDelete(null); toast.show("Link deleted", "success");
  });

  const LinkCard = ({ l }: { l: LinkDto }) => (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="link" size={18} tone="secondary" />
        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{l.isPrimary ? "My link" : l.label}</Text>
        {l.closed ? <Badge label="Closed" /> : l.paused ? <Badge label="Paused" tone="warning" /> : <Badge label="Live" tone="success" />}
      </View>
      {l.prompt ? <Text>“{l.prompt}”</Text> : null}
      <Text selectable tone="primary" numberOfLines={1} style={{ fontFamily: "Inter_500Medium" }}>{l.url}</Text>
      {l.closesAt ? <Text variant="caption" tone="muted">{l.closed ? "Closed" : "Closes"} {new Date(l.closesAt).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Text> : null}
      <Text variant="caption" tone="muted">{countLabel(l.views)} views · {countLabel(l.messages)} messages</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {!l.closed ? <Button title="Share" small onPress={() => share(l)} style={{ flex: 1 }} /> : null}
        <Button title="Copy" small variant="secondary" onPress={() => copy(l)} style={{ flex: 1 }} />
      </View>
      {!l.isPrimary ? <Button title="See responses" small variant="secondary" onPress={() => router.navigate({ pathname: "/inbox", params: { round: l.id } })} /> : null}
      {l.closed ? <Button title="Reopen for 24h" small variant="ghost" disabled={busy} onPress={() => guard(async () => { replaceLink(await api.links.update(l.id, { paused: false, closesAt: new Date(Date.now() + 86_400_000).toISOString() })); toast.show("Round reopened", "success"); })} /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
        <Text tone="muted">Pause this link</Text>
        <Switch accessibilityLabel={`Pause ${l.isPrimary ? "my link" : l.label}`} value={l.paused} disabled={busy} onValueChange={(v) => { haptic.select(); void setPaused(l, v); }} trackColor={{ true: colors.primary, false: colors.border }} />
      </View>
      {!l.isPrimary ? <Button title="Delete link" small variant="danger" onPress={() => setToDelete(l)} /> : null}
    </Card>
  );

  return (
    <Screen tabs refreshing={links.refreshing} onRefresh={links.refresh}>
      <Text variant="title">Share</Text>
      <Text tone="muted">Start an anonymous round, send its link, and people can write to you without signing up.</Text>
      {links.loading ? <SkeletonList count={2} /> : links.error && !links.data ? <ErrorState message={links.error} onRetry={links.reload} /> : (
        <>
          <Button title="Start a new round" onPress={() => setCreating(true)} disabled={items.length >= LIMITS.linksPerUser} icon={<Icon name="plus" size={18} color="#fff" />} />
          <Text variant="heading" style={{ marginTop: 8 }}>Your rounds</Text>
          {extras.length === 0 ? <Text tone="muted">No rounds yet. Each round gets its own question, link and inbox view.</Text> : extras.map((l) => <LinkCard key={l.id} l={l} />)}
          <Text variant="heading" style={{ marginTop: 8 }}>Always-on link</Text>
          {primary ? <LinkCard l={primary} /> : <EmptyState icon="link" title="No link yet" body="Pull to refresh." />}
          <Card style={{ gap: 10, marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon name="send" size={18} tone="secondary" /><Text variant="bodyStrong">Download the app</Text></View>
            <Text tone="muted">Send friends the install link. It opens the right steps for iPhone, Android or desktop.</Text>
            <Text selectable tone="primary" numberOfLines={1}>{installUrl}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button title="Send link" small onPress={inviteToApp} style={{ flex: 1 }} />
              <Button title="Copy" small variant="secondary" onPress={copyInstall} style={{ flex: 1 }} />
            </View>
          </Card>
        </>
      )}
      <BottomSheet visible={creating} onClose={() => setCreating(false)} title="New anonymous round">
        <Input label="Round name" value={label} onChangeText={setLabel} placeholder="e.g. Friday dinner ideas" maxLength={LIMITS.linkLabelMax} />
        <Input label="Your question (optional)" value={question} onChangeText={setQuestion} placeholder="What should I cook on Friday? 🍳" maxLength={LIMITS.roundPromptMax} returnKeyType="done" />
        <Text variant="caption" tone="muted">Close it automatically after</Text>
        <Chips label="Round duration" value={duration} onChange={setDuration} options={[{ value: "none", label: "No end" }, { value: "1", label: "1 hour" }, { value: "24", label: "24 hours" }, { value: "72", label: "3 days" }, { value: "168", label: "7 days" }]} />
        <Button title="Create round & share" onPress={create} loading={busy} disabled={label.trim().length === 0} />
      </BottomSheet>
      <ConfirmSheet visible={!!toDelete} title="Delete this link?" message={`"${toDelete?.label ?? ""}" will stop working. Messages already received stay in your inbox.`} confirmLabel="Delete" destructive loading={busy} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </Screen>
  );
}
