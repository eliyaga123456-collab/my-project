import { View } from "react-native";
import { Tabs } from "expo-router/js-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { CountDot } from "@/components/Badge";
import { Icon, type IconName } from "@/components/Icon";
import { PressableScale } from "@/components/Pressable";
import { Text } from "@/components/Text";
import { useTheme, withAlpha } from "@/theme";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/providers/AuthProvider";
import { useT, type Key } from "@/i18n";

const META: Record<string, { label: Key; icon: IconName }> = {
  inbox: { label: "tabs.inbox", icon: "inbox" },
  share: { label: "tabs.share", icon: "share" },
  activity: { label: "tabs.activity", icon: "bell" },
  me: { label: "tabs.me", icon: "user" }
};

type BarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

function TabBar({ state, navigation }: BarProps) {
  const { colors, name } = useTheme();
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const { t } = useT();
  const badges: Record<string, number> = { inbox: me?.unreadMessages ?? 0, activity: me?.unreadNotifications ?? 0 };
  return (
    <View style={{ position: "absolute", start: 16, end: 16, bottom: Math.max(insets.bottom, 12) }}>
      <View style={{ borderRadius: 32, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
        <BlurView intensity={40} tint={name === "dark" ? "dark" : "light"} style={{ flexDirection: "row", padding: 6, backgroundColor: withAlpha(colors.surface, 0.85) }} accessibilityRole="tablist">
          {state.routes.map((route, index) => {
            const meta = META[route.name];
            if (!meta) return null;
            const focused = state.index === index;
            const count = badges[route.name] ?? 0;
            const label = t(meta.label);
            return (
              <PressableScale
                key={route.key}
                depth={1}
                accessibilityRole="tab"
                accessibilityLabel={count > 0 ? t("tabs.unreadLabel", { label, count }) : label}
                accessibilityState={{ selected: focused }}
                onPress={() => {
                  const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!focused && !e.defaultPrevented) { haptic.select(); navigation.navigate(route.name); }
                }}
                style={{ flex: 1, minHeight: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: focused ? withAlpha(colors.primary, 0.16) : "transparent" }}
              >
                <View>
                  <Icon name={meta.icon} size={22} tone={focused ? "primary" : "muted"} />
                  {count > 0 ? <View style={{ position: "absolute", top: -6, end: -12 }}><CountDot count={count} /></View> : null}
                </View>
                <Text variant="caption" tone={focused ? "primary" : "muted"} style={{ fontSize: 11, lineHeight: 14, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
              </PressableScale>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="share" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
