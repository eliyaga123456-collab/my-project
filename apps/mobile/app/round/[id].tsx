export { ErrorBoundary } from "@/components/RouteErrorBoundary";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LIMITS } from "@unsaid/shared";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Chips } from "@/components/Chips";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { ErrorState } from "@/components/ErrorState";
import { IconButton } from "@/components/IconButton";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { QrCode } from "@/components/QrCode";
import { QrSheet } from "@/components/QrSheet";
import { ShareTargets } from "@/components/ShareTargets";
import { SkeletonList } from "@/components/Skeleton";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { WEB_URL } from "@/lib/env";
import { errorMessage } from "@/lib/errors";
import { haptic } from "@/lib/haptics";
import { useRequest } from "@/lib/hooks";
import { linkShareMessage, linkUrl, safely } from "@/lib/share";
import { useT } from "@/i18n";
import { useNetwork } from "@/providers/NetworkProvider";
import { Share } from "react-native";

type Duration = "none" | "1" | "24" | "72" | "168";

/** A single round: its link front and centre, one-tap copy and share, optional edits below. */
export default function RoundScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const router = useRouter();
  const { t } = useT();
  const toast = useToast();
  const { report } = useNetwork();
  const { data, setData, error, loading, reload } = useRequest(() => api.links.list().then((r) => r.items.find((l) => l.id === String(id)) ?? null), [id]);
  const [label, setLabel] = useState("");
  const [question, setQuestion] = useState("");
  const [duration, setDuration] = useState<Duration>("none");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [qr, setQr] = useState(false);

  // A just-created round opens the system share sheet once, so the link goes out immediately.
  const autoShared = useRef(false);
  useEffect(() => {
    if (!data || fresh !== "1" || autoShared.current) return;
    autoShared.current = true;
    void safely(() => Share.share({ message: linkShareMessage(data.prompt, linkUrl(WEB_URL, data, undefined)) }));
  }, [data, fresh]);
  useEffect(() => { if (data) { setLabel(data.label); setQuestion(data.prompt ?? ""); } }, [data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guard = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast.show(errorMessage(e), "error"); report(e); } setBusy(false); };
  const link = data;
  const url = link ? linkUrl(WEB_URL, link, undefined) : "";
  const text = link ? linkShareMessage(link.prompt, url) : "";
  const copy = () => safely(() => Clipboard.setStringAsync(url), () => toast.show(t("errors.generic"), "error")).then((ok) => { if (ok) { haptic.success(); toast.show(t("share.linkCopied"), "success"); } });
  const save = () => guard(async () => {
    if (!link) return;
    const hours = duration === "none" ? undefined : Number(duration);
    const next = await api.links.update(link.id, { label: label.trim() || link.label, prompt: question.trim() || null, ...(hours ? { closesAt: new Date(Date.now() + hours * 3_600_000).toISOString() } : {}) });
    setData(next); toast.show(t("round.saved"), "success");
  });
  const remove = () => guard(async () => {
    if (!link) return;
    await api.links.remove(link.id);
    toast.show(t("share.linkDeleted"), "success");
    router.back();
  });

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>{link?.label ?? t("round.title")}</Text>
        <IconButton icon="close" label={t("message.close")} filled onPress={() => (router.canGoBack() ? router.back() : router.replace("/share"))} />
      </View>
      {loading ? <SkeletonList count={2} /> : error || !link ? <ErrorState message={error ?? t("round.notFound")} onRetry={reload} /> : (
        <>
          <Card glow style={{ gap: 12 }}>
            <Text variant="label" tone="muted">{t("round.yourLink")}</Text>
            <Text selectable tone="primary" style={{ fontSize: 17, textAlign: "left", writingDirection: "ltr" }}>{url}</Text>
            <View style={{ alignItems: "center", paddingVertical: 4 }}>
              <QrCode value={url} size={170} radius={16} />
              <Text variant="caption" tone="muted" style={{ marginTop: 8 }}>{t("qr.hint")}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button title={t("round.copyLink")} onPress={() => void copy()} style={{ flex: 1 }} />
              <Button title={t("qr.show")} variant="secondary" onPress={() => setQr(true)} />
            </View>
          </Card>
          <ShareTargets text={text} url={url} onMore={() => void safely(() => Share.share({ message: text }), () => toast.show(t("errors.generic"), "error"))} />
          <Button title={t("share.seeResponses")} variant="secondary" onPress={() => router.navigate({ pathname: "/inbox", params: { round: link.id } })} />
          <Card style={{ gap: 12 }}>
            <Text variant="bodyStrong">{t("round.editTitle")}</Text>
            <Input label={t("share.roundName")} value={label} onChangeText={setLabel} maxLength={LIMITS.linkLabelMax} />
            <Input label={t("share.yourQuestion")} value={question} onChangeText={setQuestion} placeholder={t("share.questionPlaceholder")} maxLength={LIMITS.roundPromptMax} returnKeyType="done" />
            <Chips label={t("share.durationLabel")} value={duration} onChange={setDuration} options={[{ value: "none", label: t("round.keepOpen") }, { value: "1", label: t("share.durations.h1") }, { value: "24", label: t("share.durations.h24") }, { value: "72", label: t("share.durations.d3") }, { value: "168", label: t("share.durations.d7") }]} />
            <Button title={t("common.save")} variant="secondary" onPress={() => void save()} loading={busy} />
          </Card>
          {!link.isPrimary ? <Button title={t("share.deleteLink")} variant="ghost" onPress={() => setConfirmDelete(true)} /> : null}
        </>
      )}
      <QrSheet visible={qr} url={url} onClose={() => setQr(false)} title={link?.label} />
      <ConfirmSheet visible={confirmDelete} title={t("share.deleteTitle")} message={t("share.deleteBody", { label: link?.label ?? "" })} confirmLabel={t("common.delete")} destructive loading={busy} onConfirm={() => { setConfirmDelete(false); void remove(); }} onCancel={() => setConfirmDelete(false)} />
    </Screen>
  );
}
