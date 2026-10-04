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
import { useToast } from "@/components/Toast";
import { WEB_URL } from "@/lib/env";
import { linkUrl, safely } from "@/lib/share";
import { ErrorState } from "@/components/ErrorState";
import { IconButton } from "@/components/IconButton";
import { useMessageActions } from "@/components/MessageActions";
import { Screen } from "@/components/Screen";
import { SkeletonList } from "@/components/Skeleton";
import { Text } from "@/components/Text";
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
  const myUrl = linkUrl(WEB_URL, { isPrimary: true, slug: "" }, me?.profile.username);
  const { data, setData, error, loading, reload } = useRequest(() => api.messages.get(String(id)), [id]);

  const actions = useMessageActions({
    onUpdated: (m: MessageDto) => setData(m),
    onRemoved: () => { void refreshMe().catch(() => undefined); router.back(); }
  });

  const copyLink = () => safely(() => Clipboard.setStringAsync(myUrl), () => toast.show(t("errors.generic"), "error")).then((ok) => { if (ok) toast.show(t("message.linkCopied"), "success"); });
  const shareStory = async () => {
    setBusy(true);
    await safely(async () => {
      const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile", width: STORY_SIZE.width * 4, height: STORY_SIZE.height * 4 });
      if (!(await Sharing.isAvailableAsync())) { toast.show(t("actions.sharingUnavailable"), "error"); return; }
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
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="title" style={{ flex: 1 }}>{t("message.title")}</Text>
        <IconButton icon="close" label={t("message.close")} filled onPress={() => (router.canGoBack() ? router.back() : router.replace("/inbox"))} />
      </View>
      {loading ? <SkeletonList count={1} /> : error || !data ? <ErrorState message={error ?? t("message.notFound")} onRetry={reload} /> : (
        <>
          <Text variant="label" tone="muted">{t("message.anonymousAgo", { time: formatRelative(data.createdAt) })}</Text>
          <View style={{ alignItems: "center" }}>
            <MessageStoryCard ref={cardRef} body={data.body} handleUrl={myUrl} />
          </View>
          <Button title={t("message.shareStory")} onPress={() => void shareStory()} loading={busy} />
          <Button title={t("message.copyMyLink")} variant="secondary" onPress={() => void copyLink()} />
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
