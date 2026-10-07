export { ErrorBoundary } from "@/components/RouteErrorBoundary";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
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

/** Icon that springs up a little when its tab becomes active. */
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const reduce = useReducedMotion();
  const s = useSharedValue(focused ? 1 : 0);
  useEffect(() => { s.value = reduce ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, { damping: 7, stiffness: 240 }); }, [focused, reduce, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: 1 + s.value * 0.16 }, { translateY: -s.value * 1.5 }] }));
  return <Animated.View style={a}><Icon name={name} size={22} tone={focused ? "primary" : "muted"} /></Animated.View>;
}

type BarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

function TabBar({ state, navigation }: BarProps) {
  const { colors, name } = useTheme();
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const { t, isRTL } = useT();
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const visible = state.routes.filter((r) => META[r.name]);
  const slot = w > 12 ? (w - 12) / Math.max(1, visible.length) : 0;
  const pos = Math.max(0, visible.findIndex((r) => r.key === state.routes[state.index]?.key));
  const x = useSharedValue(0);
  const placed = useState({ v: false })[0];
  const target = (isRTL ? -pos : pos) * slot;
  useEffect(() => {
    if (slot <= 0) return;
    if (!placed.v || reduce) { x.value = target; placed.v = true; } else x.value = withSpring(target, { damping: 15, stiffness: 220 });
  }, [slot, target, reduce, x, placed]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const badges: Record<string, number> = { inbox: me?.unreadMessages ?? 0, activity: me?.unreadNotifications ?? 0 };
  return (
    <View style={{ position: "absolute", start: 16, end: 16, bottom: Math.max(insets.bottom, 12) }}>
      <View style={{ borderRadius: 32, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
        <BlurView intensity={40} tint={name === "dark" ? "dark" : "light"} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: "row", padding: 6, backgroundColor: withAlpha(colors.surface, 0.85) }} accessibilityRole="tablist">
          {slot > 0 ? (
            <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 6, bottom: 6, start: 6, width: slot, borderRadius: 26, overflow: "hidden", borderWidth: 1, borderColor: withAlpha(colors.primary, 0.45) }, pill]}>
              <LinearGradient colors={[withAlpha(colors.primary, 0.28), withAlpha(colors.secondary, 0.16)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
              <LinearGradient colors={["rgba(255,255,255,0.25)", "transparent"]} style={{ position: "absolute", top: 0, start: 0, end: 0, height: "50%" }} />
            </Animated.View>
          ) : null}
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
                style={{ flex: 1, minHeight: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", gap: 2 }}
              >
                <View>
                  <TabIcon name={meta.icon} focused={focused} />
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
