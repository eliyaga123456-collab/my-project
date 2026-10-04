import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { NotificationDto } from "@unsaid/shared";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { SkeletonList } from "@/components/Skeleton";
import { PressableScale } from "@/components/Pressable";
import { Text } from "@/components/Text";
import { api } from "@/lib/api";
import { useT } from "@/i18n";
import { useRequest } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { useNetwork } from "@/providers/NetworkProvider";
import { useToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";

export default function Activity() {
  const router = useRouter();
  const { t, formatRelative } = useT();
  const toast = useToast();
  const { report } = useNetwork();
  const { patchMe, refreshMe } = useAuth();
  const q = useRequest(() => api.notifications.list({ limit: 30 }));
  const [more, setMore] = useState<NotificationDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const seeded = useRef<string | null>(null);

  useFocusEffect(useCallback(() => { void q.refresh(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));
  useEffect(() => { if (q.data && seeded.current !== `${q.data.nextCursor}:${q.data.items.length}`) { seeded.current = `${q.data.nextCursor}:${q.data.items.length}`; setMore([]); setCursor(q.data.nextCursor); } }, [q.data]);

  const items = [...(q.data?.items ?? []), ...more];
  const unread = items.filter((n) => !n.readAt).length;

  const markRead = async (ids: string[] | "all") => {
    try {
      await api.notifications.markRead(ids === "all" ? { all: true } : { ids });
      const now = new Date().toISOString();
      const mark = (n: NotificationDto) => (ids === "all" || ids.includes(n.id) ? { ...n, readAt: n.readAt ?? now } : n);
      q.setData((d) => (d ? { ...d, items: d.items.map(mark), unread: ids === "all" ? 0 : Math.max(0, d.unread - ids.length) } : d));
      setMore((m) => m.map(mark));
      patchMe((m) => ({ ...m, unreadNotifications: ids === "all" ? 0 : Math.max(0, m.unreadNotifications - ids.length) }));
      void refreshMe().catch(() => undefined);
    } catch (e) { toast.show(errorMessage(e), "error"); report(e); }
  };

  const loadMore = async () => {
    if (!cursor) return;
    try {
      const p = await api.notifications.list({ cursor, limit: 30 });
      setMore((m) => [...m, ...p.items]); setCursor(p.nextCursor);
    } catch (e) { toast.show(errorMessage(e), "error"); report(e); }
  };

  const open = (n: NotificationDto) => {
    if (!n.readAt) void markRead([n.id]);
    const id = n.data?.messageId;
    if (id) router.push(`/message/${id}`);
  };

  return (
    <Screen tabs refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="title" style={{ flex: 1 }}>{t("activity.title")}</Text>
        {unread > 0 ? <Button title={t("activity.markAllRead")} small variant="ghost" onPress={() => markRead("all")} /> : null}
      </View>
      {q.loading ? <SkeletonList count={4} /> : q.error && !q.data ? <ErrorState message={q.error} onRetry={q.reload} /> : items.length === 0 ? (
        <EmptyState icon="bell" title={t("activity.emptyTitle")} body={t("activity.emptyBody")} />
      ) : (
        <>
          {items.map((n) => (
            <PressableScale key={n.id} depth={1} accessibilityRole="button" accessibilityLabel={`${n.readAt ? "" : t("activity.unreadPrefix")}${n.title}. ${n.body}. ${formatRelative(n.createdAt)}`} accessibilityHint={n.data?.messageId ? t("activity.opensMessage") : t("activity.marksRead")} onPress={() => open(n)}>
              <Card glow={!n.readAt} style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Text variant="bodyStrong" style={{ flex: 1 }}>{n.title}</Text>
                  <Text variant="caption" tone="muted">{formatRelative(n.createdAt)}</Text>
                </View>
                <Text tone="muted">{n.body}</Text>
              </Card>
            </PressableScale>
          ))}
          {cursor ? <Button title={t("activity.loadMore")} variant="secondary" small onPress={loadMore} /> : null}
        </>
      )}
    </Screen>
  );
}
