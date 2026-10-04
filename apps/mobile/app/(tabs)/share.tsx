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

export default function SharePage() {
  const { colors } = useTheme();
  const toast = useToast();
  const { report } = useNetwork();
  const links = useRequest(() => api.links.list().then((r) => r.items));
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<LinkDto | null>(null);

  useFocusEffect(useCallback(() => { void links.refresh(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const items = links.data ?? [];
  const primary = items.find((l) => l.isPrimary);
  const extras = items.filter((l) => !l.isPrimary);

  const replaceLink = (l: LinkDto) => links.setData((cur) => (cur ?? []).map((x) => (x.id === l.id ? l : x)));
  const guard = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.show(errorMessage(e), "error"); report(e); } setBusy(false); };

  const copy = async (l: LinkDto) => { await Clipboard.setStringAsync(l.url); haptic.success(); toast.show("Link copied", "success"); };
  const share = (l: LinkDto) => Share.share({ message: `Send me an anonymous message: ${l.url}`, url: l.url }).catch(() => undefined);
  const setPaused = (l: LinkDto, paused: boolean) => guard(async () => {
    const u = l.isPrimary ? await api.links.pause(paused) : await api.links.update(l.id, { paused });
    replaceLink(u); toast.show(paused ? "Link paused" : "Link is live", "success");
  });
  const create = () => guard(async () => {
    const l = await api.links.create(label.trim());
    links.setData((cur) => [...(cur ?? []), l]); setLabel(""); setCreating(false); toast.show("Link created", "success");
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
        {l.paused ? <Badge label="Paused" tone="warning" /> : <Badge label="Live" tone="success" />}
      </View>
      <Text selectable tone="primary" numberOfLines={1} style={{ fontFamily: "Inter_500Medium" }}>{l.url}</Text>
      <Text variant="caption" tone="muted">{countLabel(l.views)} views · {countLabel(l.messages)} messages</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="Share" small onPress={() => share(l)} style={{ flex: 1 }} />
        <Button title="Copy" small variant="secondary" onPress={() => copy(l)} style={{ flex: 1 }} />
      </View>
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
      <Text tone="muted">Post your link anywhere. People can write to you without signing up.</Text>
      {links.loading ? <SkeletonList count={2} /> : links.error && !links.data ? <ErrorState message={links.error} onRetry={links.reload} /> : (
        <>
          {primary ? <LinkCard l={primary} /> : <EmptyState icon="link" title="No link yet" body="Pull to refresh." />}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <Text variant="heading">Extra links</Text>
            <IconButton icon="plus" label="Add extra link" filled onPress={() => setCreating(true)} disabled={items.length >= LIMITS.linksPerUser} />
          </View>
          <Text variant="caption" tone="muted">Use a separate link per place you post (bio, story, group) to see where messages come from.</Text>
          {extras.length === 0 ? <Text tone="muted">No extra links.</Text> : extras.map((l) => <LinkCard key={l.id} l={l} />)}
        </>
      )}
      <BottomSheet visible={creating} onClose={() => setCreating(false)} title="New link">
        <Input label="Label" value={label} onChangeText={setLabel} placeholder="e.g. Instagram bio" maxLength={LIMITS.linkLabelMax} returnKeyType="done" onSubmitEditing={() => label.trim() && create()} />
        <Button title="Create link" onPress={create} loading={busy} disabled={label.trim().length === 0} />
      </BottomSheet>
      <ConfirmSheet visible={!!toDelete} title="Delete this link?" message={`"${toDelete?.label ?? ""}" will stop working. Messages already received stay in your inbox.`} confirmLabel="Delete" destructive loading={busy} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </Screen>
  );
}
