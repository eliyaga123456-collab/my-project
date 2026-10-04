import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { SkeletonList } from "@/components/Skeleton";
import { SubHeader } from "@/components/SubHeader";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { describeUserAgent } from "@/lib/format";
import { useT } from "@/i18n";
import { useRequest } from "@/lib/hooks";
import { View } from "react-native";

export default function Sessions() {
  const toast = useToast();
  const { t, formatRelative } = useT();
  const q = useRequest(() => api.auth.sessions().then((r) => r.items));
  const revoke = async (id: string) => {
    try { await api.auth.revokeSession(id); q.setData((d) => (d ?? []).filter((s) => s.id !== id)); toast.show(t("settings.sessions.signedOut"), "success"); }
    catch (e) { toast.show(errorMessage(e), "error"); }
  };
  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <SubHeader title={t("settings.sessions.title")} />
      <Text tone="muted">{t("settings.sessions.intro")}</Text>
      {q.loading ? <SkeletonList count={3} /> : q.error && !q.data ? <ErrorState message={q.error} onRetry={q.reload} /> : (q.data ?? []).map((s) => (
        <Card key={s.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text variant="bodyStrong" style={{ flex: 1 }}>{(() => { const d = describeUserAgent(s.userAgent); return d.kind === "other" ? d.raw : t(`settings.sessions.device.${d.kind}`); })()}</Text>
            {s.current ? <Badge label={t("settings.sessions.thisDevice")} tone="success" /> : null}
          </View>
          <Text variant="caption" tone="muted">{t("settings.sessions.lastActive", { last: formatRelative(s.lastUsedAt), created: formatRelative(s.createdAt) })}</Text>
          {!s.current ? <Button title={t("settings.sessions.signOut")} small variant="danger" onPress={() => revoke(s.id)} /> : null}
        </Card>
      ))}
    </Screen>
  );
}
