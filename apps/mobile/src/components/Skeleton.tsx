import { useEffect, useState } from "react";
import { View, type DimensionValue } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, withAlpha } from "@/theme";
import { useT } from "@/i18n";
import { InkIn } from "@/theme/motion";

/** Placeholder bar with a glossy light sweep (static block under reduce-motion). */
export function Skeleton({ width = "100%", height = 16, radius = 8 }: { width?: DimensionValue; height?: number; radius?: number }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!reduce) x.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [reduce, x]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: (x.value * 2 - 1) * w }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ width, height, borderRadius: radius, backgroundColor: colors.surfaceRaised, overflow: "hidden" }}>
      {!reduce && w > 0 ? (
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: w }, sweep]}>
          <LinearGradient colors={["transparent", withAlpha(colors.primary, 0.22), "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function MessageSkeleton() {
  const { colors, radii } = useTheme();
  const { t } = useT();
  return (
    <View accessibilityLabel={t("common.loading")} style={{ backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Skeleton width={22} height={22} radius={11} />
        <Skeleton width="30%" height={12} />
      </View>
      <Skeleton height={16} />
      <Skeleton width="80%" height={16} />
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return <View style={{ gap: 12 }}>{Array.from({ length: count }, (_, i) => <InkIn key={i} delay={i * 70}><MessageSkeleton /></InkIn>)}</View>;
}
