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
import { describeUserAgent, timeAgo } from "@/lib/format";
import { useRequest } from "@/lib/hooks";
import { View } from "react-native";

export default function Sessions() {
  const toast = useToast();
  const q = useRequest(() => api.auth.sessions().then((r) => r.items));
  const revoke = async (id: string) => {
    try { await api.auth.revokeSession(id); q.setData((d) => (d ?? []).filter((s) => s.id !== id)); toast.show("Session signed out", "success"); }
    catch (e) { toast.show(errorMessage(e), "error"); }
  };
  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <SubHeader title="Sessions" />
      <Text tone="muted">Devices and browsers signed in to your account.</Text>
      {q.loading ? <SkeletonList count={3} /> : q.error && !q.data ? <ErrorState message={q.error} onRetry={q.reload} /> : (q.data ?? []).map((s) => (
        <Card key={s.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text variant="bodyStrong" style={{ flex: 1 }}>{describeUserAgent(s.userAgent)}</Text>
            {s.current ? <Badge label="This device" tone="success" /> : null}
          </View>
          <Text variant="caption" tone="muted">Last active {timeAgo(s.lastUsedAt)} · signed in {timeAgo(s.createdAt)}</Text>
          {!s.current ? <Button title="Sign out" small variant="danger" onPress={() => revoke(s.id)} /> : null}
        </Card>
      ))}
    </Screen>
  );
}
