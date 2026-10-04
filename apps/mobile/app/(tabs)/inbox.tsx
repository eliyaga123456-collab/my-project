import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MessageDto, MessageStatus } from "@unsaid/shared";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner, ErrorState } from "@/components/ErrorState";
import { MessageCard } from "@/components/MessageCard";
import { useMessageActions } from "@/components/MessageActions";
import { SkeletonList } from "@/components/Skeleton";
import { Tabs, type SegmentOption } from "@/components/Tabs";
import { Text } from "@/components/Text";
import { api } from "@/lib/api";
import { errorMessage, isNetworkError } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";
import { useNetwork } from "@/providers/NetworkProvider";
import { useTheme } from "@/theme";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Chips } from "@/components/Chips";
import type { LinkDto } from "@unsaid/shared";

const SEGMENTS: SegmentOption<MessageStatus>[] = [
  { value: "inbox", label: "Inbox" },
  { value: "filtered", label: "Filtered" },
  { value: "archived", label: "Archived" }
];
const EMPTY: Record<MessageStatus, { title: string; body: string }> = {
  inbox: { title: "Nothing here yet", body: "Share your link and the first anonymous message will land here." },
  filtered: { title: "Nothing filtered", body: "Messages our safety filter holds back show up here so you can look when you're ready." },
  archived: { title: "Nothing archived", body: "Archived messages are kept here, out of sight." }
};

export default function Inbox() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { me, refreshMe } = useAuth();
  const { report, ok } = useNetwork();
  const params = useLocalSearchParams<{ round?: string }>();
  const [round, setRound] = useState<string>("all");
  const [rounds, setRounds] = useState<LinkDto[]>([]);
  useEffect(() => { if (params.round) setRound(params.round); }, [params.round]);
  const [status, setStatus] = useState<MessageStatus>("inbox");
  const [items, setItems] = useState<MessageDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async (mode: "initial" | "refresh", seg: MessageStatus, linkId: string = round) => {
    const id = ++seq.current;
    if (mode === "initial") setLoading(true); else setRefreshing(true);
    try {
      const page = await api.messages.list({ status: seg, limit: 20, ...(linkId !== "all" ? { linkId } : {}) });
      if (id !== seq.current) return;
      setItems(page.items); setCursor(page.nextCursor); setError(null); setOffline(false); ok();
    } catch (e) {
      if (id !== seq.current) return;
      setError(errorMessage(e)); setOffline(isNetworkError(e)); report(e);
    } finally {
      if (id === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [ok, report, round]);

  useEffect(() => { void load("initial", status); }, [status, round, load]);
  useFocusEffect(useCallback(() => { void refreshMe().catch(() => undefined); api.links.list().then((r) => setRounds(r.items.filter((l) => !l.isPrimary)), () => undefined); }, [refreshMe]));

  const loadMore = async () => {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    const id = seq.current;
    try {
      const page = await api.messages.list({ status, cursor, limit: 20, ...(round !== "all" ? { linkId: round } : {}) });
      if (id !== seq.current) return;
      setItems((cur) => [...cur, ...page.items.filter((p) => !cur.some((c) => c.id === p.id))]);
      setCursor(page.nextCursor);
    } catch (e) { report(e); setError(errorMessage(e)); }
    setLoadingMore(false);
  };

  const actions = useMessageActions({
    onUpdated: useCallback((m: MessageDto) => setItems((cur) => cur.map((c) => (c.id === m.id ? m : c))), []),
    onRemoved: useCallback((id: string) => { setItems((cur) => cur.filter((c) => c.id !== id)); void refreshMe().catch(() => undefined); }, [refreshMe])
  });

  const header = (
    <View style={{ gap: 14, marginBottom: 16 }}>
      <Text variant="title">Inbox</Text>
      <Text tone="muted">{me ? `@${me.profile.username}` : ""}</Text>
      {rounds.length > 0 ? <Chips scroll label="Filter by round" value={round} onChange={setRound} options={[{ value: "all", label: "All messages" }, ...rounds.map((r) => ({ value: r.id, label: r.label }))]} /> : null}
      <Tabs options={SEGMENTS} value={status} onChange={setStatus} />
      {error && items.length > 0 ? <ErrorBanner message={error} onRetry={() => load("refresh", status)} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={loading || (error && items.length === 0) ? [] : items}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 120, flexGrow: 1 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <MessageCard message={item} index={index} onPress={(m) => router.push(`/message/${m.id}`)} onLongPress={(m) => actions.open(m)} onReply={(m) => actions.open(m, "reply")} onDelete={actions.askDelete} />
        )}
        ListEmptyComponent={
          loading ? <SkeletonList /> :
          error ? <ErrorState message={error} offline={offline} onRetry={() => load("initial", status)} /> :
          <EmptyState icon="inbox" title={EMPTY[status].title} body={EMPTY[status].body} actionLabel={status === "inbox" ? "Share my link" : undefined} onAction={() => router.push("/share")} />
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh", status)} tintColor={colors.primary} colors={[colors.primary]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
      />
      {actions.element}
    </View>
  );
}
