import { useEffect } from "react";
import { View, type DimensionValue } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme";
import { useT } from "@/i18n";

export function Skeleton({ width = "100%", height = 16, radius = 8 }: { width?: DimensionValue; height?: number; radius?: number }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const o = useSharedValue(0.5);
  useEffect(() => {
    if (!reduce) o.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [reduce, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceRaised }, a]} />;
}

export function MessageSkeleton() {
  const { colors, radii } = useTheme();
  const { t } = useT();
  return (
    <View accessibilityLabel={t("common.loading")} style={{ backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border }}>
      <Skeleton width="30%" height={12} />
      <Skeleton height={16} />
      <Skeleton width="80%" height={16} />
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return <View style={{ gap: 12 }}>{Array.from({ length: count }, (_, i) => <MessageSkeleton key={i} />)}</View>;
}
