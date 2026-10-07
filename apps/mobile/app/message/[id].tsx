export { ErrorBoundary } from "@/components/RouteErrorBoundary";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { MessageDto } from "@unsaid/shared";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { MessageStoryCard, STORY_SIZE } from "@/components/MessageStoryCard";
import { QrSheet } from "@/components/QrSheet";
import { MessageSquareCard } from "@/components/MessageSquareCard";
import { Chips } from "@/components/Chips";
import { useToast } from "@/components/Toast";
import { WEB_URL } from "@/lib/env";
import { makeCardVideo } from "@/lib/shareVideo";
import { errorMessage } from "@/lib/errors";
import { linkUrl, safely } from "@/lib/share";
import { ErrorState } from "@/components/ErrorState";
import { IconButton } from "@/components/IconButton";
import { useMessageActions } from "@/components/MessageActions";
import { Screen } from "@/components/Screen";
import { SkeletonList } from "@/components/Skeleton";
import { Text } from "@/components/Text";
import { SparkleBurst } from "@/components/Sparkles";
import { InkIn } from "@/theme/motion";
import { api } from "@/lib/api";
import { useT } from "@/i18n";
import { useRequest } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";

export default function MessageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, formatRelative } = useT();
  const { refreshMe, me } = useAuth();
  const toast = useToast();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState(false);
  const [burst, setBurst] = useState(0);
  const [format, setFormat] = useState<"square" | "story" | "video">("square");
  const myUrl = linkUrl(WEB_URL, { isPrimary: true, slug: "" }, me?.profile.username);
  const { data, setData, error, loading, reload } = useRequest(() => api.messages.get(String(id)), [id]);

  const actions = useMessageActions({
    onUpdated: (m: MessageDto) => setData(m),
    onRemoved: () => { void refreshMe().catch(() => undefined); router.back(); }
  });

  const copyLink = () => safely(() => Clipboard.setStringAsync(myUrl), () => toast.show(t("errors.generic"), "error")).then((ok) => { if (ok) { setBurst((n) => n + 1); toast.show(t("message.linkCopied"), "success"); } });
  const shareStory = async () => {
    setBusy(true);
    // Instagram/TikTok cannot attach a clickable link for us, so copy it first: paste it with the Link sticker after sharing.
    await safely(() => Clipboard.setStringAsync(myUrl));
    toast.show(t("message.storyLinkHint"), "info");
    await safely(async () => {
      const square = format === "square";
      const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile", width: square ? 1080 : format === "video" ? 1080 : STORY_SIZE.width * 4, height: square ? 1080 : format === "video" ? 1920 : STORY_SIZE.height * 4 });
      if (!(await Sharing.isAvailableAsync())) { toast.show(t("actions.sharingUnavailable"), "error"); return; }
      if (format === "video") {
        toast.show(t("message.videoMaking"), "info");
        let mp4: string;
        try { mp4 = await makeCardVideo(uri); } catch (e) { toast.show(t("message.videoFailed", { reason: errorMessage(e) }), "error"); return; }
        await Sharing.shareAsync(mp4, { mimeType: "video/mp4", dialogTitle: t("message.shareVideo"), UTI: "public.mpeg-4" });
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("message.shareStory"), UTI: "public.png" });
    }, () => toast.show(t("errors.generic"), "error"));
    setBusy(false);
  };

  useEffect(() => {
    if (data && !data.read) {
      api.messages.update(data.id, { read: true }).then((m) => { setData(m); void refreshMe().catch(() => undefined); }).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  return (
    <Screen overlay={<SparkleBurst trigger={burst} top="55%" />}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="title" style={{ flex: 1 }}>{t("message.title")}</Text>
        <IconButton icon="close" label={t("message.close")} filled onPress={() => (router.canGoBack() ? router.back() : router.replace("/inbox"))} />
      </View>
      {loading ? <SkeletonList count={1} /> : error || !data ? <ErrorState message={error ?? t("message.notFound")} onRetry={reload} /> : (
        <>
          <Text variant="label" tone="muted">{t("message.anonymousAgo", { time: formatRelative(data.createdAt) })}</Text>
          <Chips label={t("message.formatLabel")} value={format} onChange={setFormat} options={[{ value: "square", label: t("message.formatSquare") }, { value: "story", label: t("message.formatStory") }, { value: "video", label: t("message.formatVideo") }]} />
          <InkIn style={{ alignItems: "center" }}>
            {format === "square" ? <MessageSquareCard ref={cardRef} body={data.body} handleUrl={myUrl} /> : <MessageStoryCard ref={cardRef} body={data.body} handleUrl={myUrl} />}
          </InkIn>
          <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>{t("message.linkStickerHint")}</Text>
          <Button title={format === "video" ? t("message.shareVideo") : t("message.shareStory")} onPress={() => void shareStory()} loading={busy} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title={t("message.copyMyLink")} variant="secondary" onPress={() => void copyLink()} style={{ flex: 1 }} />
            <Button title={t("qr.show")} variant="ghost" onPress={() => setQr(true)} />
          </View>
          <QrSheet visible={qr} url={myUrl} onClose={() => setQr(false)} />
          {data.reply ? (
            <Card style={{ gap: 8 }}>
              <Text variant="label" tone="secondary">{data.reply.public ? t("message.yourPublicAnswer") : t("message.yourPrivateReply")}</Text>
              <Text selectable>{data.reply.text}</Text>
            </Card>
          ) : null}
          <Button title={data.reply ? t("message.editReply") : t("message.reply")} onPress={() => actions.open(data, "reply")} />
          {data.reply ? <Button title={t("message.shareAnswer")} variant="secondary" onPress={() => actions.open(data, "share")} /> : null}
          <Button title={t("message.moreActions")} variant="ghost" onPress={() => actions.open(data)} />
        </>
      )}
      {actions.element}
    </Screen>
  );
}
