import { useState } from "react";
import { Share, Switch, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { LinkDto } from "@unsaid/shared";
import { LIMITS } from "@unsaid/shared";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Icon } from "@/components/Icon";
import { IconButton } from "@/components/IconButton";
import { Screen } from "@/components/Screen";
import { SparkleBurst } from "@/components/Sparkles";
import { InkIn } from "@/theme/motion";
import { SkeletonList } from "@/components/Skeleton";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptics";
import { useRequest } from "@/lib/hooks";
import { useNetwork } from "@/providers/NetworkProvider";
import { fontFamily, useTheme } from "@/theme";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ShareTargets } from "@/components/ShareTargets";
import { WEB_URL } from "@/lib/env";
import { installUrl as buildInstallUrl, inviteMessage, linkShareMessage, linkUrl, safely } from "@/lib/share";
import { useAuth } from "@/providers/AuthProvider";
import { useQuickRound } from "@/lib/quickRound";
import { useRouter } from "expo-router";

export default function SharePage() {
  const { colors } = useTheme();
  const { t, formatDate } = useT();
  const toast = useToast();
  const { report } = useNetwork();
  const { me } = useAuth();
  const links = useRequest(() => api.links.list().then((r) => r.items));
  const quick = useQuickRound();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(0);
  const [toDelete, setToDelete] = useState<LinkDto | null>(null);

  useFocusEffect(useCallback(() => { void links.refresh(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const items = links.data ?? [];
  const primary = items.find((l) => l.isPrimary);
  const extras = items.filter((l) => !l.isPrimary).sort((a, b) => Number(a.closed) - Number(b.closed) || String(b.createdAt).localeCompare(String(a.createdAt)));
  const installUrl = buildInstallUrl(WEB_URL);
  const urlOf = (l: LinkDto) => linkUrl(WEB_URL, l, me?.profile.username);
  const fail = (e: unknown) => { toast.show(errorMessage(e), "error"); };

  const replaceLink = (l: LinkDto) => links.setData((cur) => (cur ?? []).map((x) => (x.id === l.id ? l : x)));
  const guard = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.show(errorMessage(e), "error"); report(e); } setBusy(false); };

  const copyText = (text: string, doneKey: "share.linkCopied" | "share.installCopied") =>
    safely(() => Clipboard.setStringAsync(text), () => toast.show(t("errors.generic"), "error")).then((ok) => { if (ok) { haptic.success(); setBurst((n) => n + 1); toast.show(t(doneKey), "success"); } });
  const copy = (l: LinkDto) => copyText(urlOf(l), "share.linkCopied");
  const sendShare = (message: string) => safely(() => Share.share({ message }), fail);
  const shareText = (l: LinkDto) => linkShareMessage(l.prompt, urlOf(l));
  const share = (l: LinkDto) => sendShare(shareText(l));
  const inviteToApp = () => sendShare(inviteMessage("share.inviteMessage", installUrl));
  const copyInstall = () => copyText(installUrl, "share.installCopied");
  const setPaused = (l: LinkDto, paused: boolean) => guard(async () => {
    const u = l.isPrimary ? await api.links.pause(paused) : await api.links.update(l.id, { paused });
    replaceLink(u); toast.show(paused ? t("share.linkPaused") : t("share.linkLive"), "success");
  });
  const remove = () => guard(async () => {
    if (!toDelete) return;
    await api.links.remove(toDelete.id);
    links.setData((cur) => (cur ?? []).filter((x) => x.id !== toDelete.id)); setToDelete(null); toast.show(t("share.linkDeleted"), "success");
  });

  const renderLink = (l: LinkDto, i = 0) => (
    <InkIn key={l.id} delay={Math.min(i, 6) * 70}>
    <Card glow={!l.isPrimary && !l.closed && !l.paused} style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="link" size={18} tone="secondary" />
        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{l.isPrimary ? t("share.myLink") : l.label}</Text>
        {l.closed ? <Badge label={t("share.closed")} /> : l.paused ? <Badge label={t("share.paused")} tone="warning" /> : <Badge label={t("share.live")} tone="success" />}
      </View>
      {l.prompt ? <Text>{"\u201C"}{l.prompt}{"\u201D"}</Text> : null}
      <Text selectable tone="primary" numberOfLines={1} style={{ fontFamily: fontFamily.bodyMedium, textAlign: "left", writingDirection: "ltr" }}>{urlOf(l)}</Text>
      {l.closesAt ? <Text variant="caption" tone="muted">{t(l.closed ? "share.closedAt" : "share.closesAt", { date: formatDate(l.closesAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) })}</Text> : null}
      <Text variant="caption" tone="muted">{t("share.stats", { views: t("share.views", { count: l.views }), messages: t("share.messages", { count: l.messages }) })}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {!l.closed ? <Button title={t("share.sharePrompt")} small onPress={() => share(l)} style={{ flex: 1 }} /> : null}
        <Button title={t("share.copy")} small variant="secondary" onPress={() => copy(l)} style={{ flex: 1 }} />
      </View>
      {!l.closed ? <ShareTargets text={shareText(l)} url={urlOf(l)} onMore={() => share(l)} /> : null}
      {!l.isPrimary ? <Button title={t("round.title")} small variant="ghost" onPress={() => router.push({ pathname: "/round/[id]", params: { id: l.id } })} /> : null}
      {!l.isPrimary ? <Button title={t("share.seeResponses")} small variant="secondary" onPress={() => router.navigate({ pathname: "/inbox", params: { round: l.id } })} /> : null}
      {l.closed ? <Button title={t("share.reopen")} small variant="ghost" disabled={busy} onPress={() => guard(async () => { replaceLink(await api.links.update(l.id, { paused: false, closesAt: new Date(Date.now() + 86_400_000).toISOString() })); toast.show(t("share.roundReopened"), "success"); })} /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
        <Text tone="muted">{t("share.pauseThis")}</Text>
        <Switch accessibilityLabel={t("share.pauseLabel", { name: l.isPrimary ? t("share.myLinkLower") : l.label })} value={l.paused} disabled={busy} onValueChange={(v) => { haptic.select(); void setPaused(l, v); }} trackColor={{ true: colors.primary, false: colors.border }} />
      </View>
      {!l.isPrimary ? <Button title={t("share.deleteLink")} small variant="danger" onPress={() => setToDelete(l)} /> : null}
    </Card>
    </InkIn>
  );

  return (
    <Screen tabs overlay={<SparkleBurst trigger={burst} />} refreshing={links.refreshing} onRefresh={links.refresh}>
      <Text variant="title">{t("share.title")}</Text>
      <Text tone="muted">{t("share.intro")}</Text>
      {links.loading ? <SkeletonList count={2} /> : links.error && !links.data ? <ErrorState message={links.error} onRetry={links.reload} /> : (
        <>
          <Button title={t("share.startRound")} onPress={() => void quick.create()} loading={quick.busy} disabled={items.length >= LIMITS.linksPerUser} icon={<Icon name="plus" size={18} color="#fff" />} />
          <Text variant="heading" style={{ marginTop: 8 }}>{t("share.yourRounds")}</Text>
          {extras.length === 0 ? <Text tone="muted">{t("share.noRounds")}</Text> : extras.map((l, i) => renderLink(l, i))}
          <Text variant="heading" style={{ marginTop: 8 }}>{t("share.alwaysOn")}</Text>
          {primary ? renderLink(primary) : <EmptyState icon="link" title={t("share.noLinkTitle")} body={t("share.noLinkBody")} />}
          <InkIn delay={200}><Card style={{ gap: 10, marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon name="send" size={18} tone="secondary" /><Text variant="bodyStrong">{t("share.downloadTitle")}</Text></View>
            <Text tone="muted">{t("share.downloadBody")}</Text>
            <Text selectable tone="primary" numberOfLines={1} style={{ textAlign: "left", writingDirection: "ltr" }}>{installUrl}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button title={t("share.sendLink")} small onPress={inviteToApp} style={{ flex: 1 }} />
              <Button title={t("share.copy")} small variant="secondary" onPress={copyInstall} style={{ flex: 1 }} />
            </View>
          </Card></InkIn>
        </>
      )}
      <ConfirmSheet visible={!!toDelete} title={t("share.deleteTitle")} message={t("share.deleteBody", { label: toDelete?.label ?? "" })} confirmLabel={t("common.delete")} destructive loading={busy} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </Screen>
  );
}
