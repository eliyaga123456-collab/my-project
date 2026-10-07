import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useTheme, withAlpha, type Colors } from "@/theme";
import { useT } from "@/i18n";
import { Text } from "./Text";

export function Badge({ label, tone = "secondary" }: { label: string; tone?: keyof Pick<Colors, "primary" | "secondary" | "success" | "warning" | "danger" | "muted"> }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={label} style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: withAlpha(colors[tone], 0.16) }}>
      <Text variant="label" style={{ color: colors[tone], fontSize: 11 }}>{label}</Text>
    </View>
  );
}

/** Unread count bubble: pops in, then breathes with a soft halo so it is noticed without being noisy. */
export function CountDot({ count }: { count: number }) {
  const { colors } = useTheme();
  const { formatNumber } = useT();
  const reduce = useReducedMotion();
  const pop = useSharedValue(0);
  const beat = useSharedValue(0);
  useEffect(() => {
    if (count <= 0 || reduce) return;
    pop.value = 0.4; pop.value = withSpring(1, { damping: 8, stiffness: 260 });
  }, [count, reduce, pop]);
  useEffect(() => {
    if (count <= 0 || reduce) return;
    beat.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1);
  }, [count > 0, reduce, beat]); // eslint-disable-line react-hooks/exhaustive-deps
  const body = useAnimatedStyle(() => ({ transform: [{ scale: (reduce ? 1 : pop.value) * (1 + beat.value * 0.08) }] }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - beat.value), transform: [{ scale: 1 + beat.value * 0.9 }] }));
  if (count <= 0) return null;
  return (
    <View accessibilityElementsHidden style={{ minWidth: 18, height: 18 }}>
      {!reduce ? <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0, borderRadius: 9, backgroundColor: colors.primary }, halo]} /> : null}
      <Animated.View style={[{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }, body]}>
        <Text variant="label" style={{ color: colors.primaryText, fontSize: 10, letterSpacing: 0 }}>{count > 99 ? `${formatNumber(99)}+` : formatNumber(count)}</Text>
      </Animated.View>
    </View>
  );
}
