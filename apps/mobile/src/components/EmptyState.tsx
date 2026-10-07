import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, withAlpha } from "@/theme";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { FloatingSparkles } from "./Sparkles";
import { Text } from "./Text";

/** Friendly empty state: a glossy bubble that gently floats, ringed by twinkling sparkles. */
export function EmptyState({ icon = "inbox", title, body, actionLabel, onAction }: { icon?: IconName; title: string; body?: string; actionLabel?: string; onAction?: () => void }) {
  const { colors, brand } = useTheme();
  const reduce = useReducedMotion();
  const bob = useSharedValue(0);
  useEffect(() => { if (!reduce) bob.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true); }, [reduce, bob]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -bob.value * 8 }, { rotate: `${(bob.value - 0.5) * 6}deg` }] }));
  const shadow = useAnimatedStyle(() => ({ opacity: 0.35 - bob.value * 0.2, transform: [{ scaleX: 1 - bob.value * 0.25 }] }));
  const g = brand.gradient;
  return (
    <View accessible accessibilityLabel={`${title}. ${body ?? ""}`} style={{ alignItems: "center", gap: 10, paddingVertical: 40, paddingHorizontal: 24 }}>
      <View style={{ width: 150, height: 120, alignItems: "center", justifyContent: "center" }}>
        <FloatingSparkles />
        <Animated.View style={[{ width: 76, height: 76, borderRadius: 38, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: withAlpha(g[1], 0.55), shadowColor: g[1], shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6 }, float]}>
          <LinearGradient colors={[withAlpha(g[0], 0.3), withAlpha(g[1], 0.3), withAlpha(g[2], 0.3)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0 }} />
          <LinearGradient colors={["rgba(255,255,255,0.4)", "transparent"]} style={{ position: "absolute", top: 0, start: 0, end: 0, height: "50%" }} />
          <Icon name={icon} size={32} tone="secondary" />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", bottom: 4, width: 54, height: 8, borderRadius: 4, backgroundColor: g[1] }, shadow]} />
      </View>
      <Text variant="heading" style={{ textAlign: "center" }}>{title}</Text>
      {body ? <Text tone="muted" style={{ textAlign: "center" }}>{body}</Text> : null}
      {actionLabel && onAction ? <View style={{ marginTop: 8 }}><Button title={actionLabel} onPress={onAction} small /></View> : null}
    </View>
  );
}
