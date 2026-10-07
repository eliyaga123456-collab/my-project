import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, withAlpha } from "@/theme";

/**
 * Surface card. `glow` gives it a glossy gradient border and tinted glass fill; `animated` (use sparingly, never per list row)
 * additionally cross-fades the border colours and breathes the halo.
 */
export function Card({ children, style, glow, animated = false, ...rest }: ViewProps & { style?: StyleProp<ViewStyle>; glow?: boolean; animated?: boolean }) {
  const { colors, radii, brand } = useTheme();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  const run = !!glow && animated && !reduce;
  useEffect(() => {
    if (run) t.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [run, t]);
  const alt = useAnimatedStyle(() => ({ opacity: t.value }));
  const halo = useAnimatedStyle(() => ({ shadowOpacity: 0.3 + t.value * 0.3 }));
  if (!glow) {
    return <View {...rest} style={[{ backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, style]}>{children}</View>;
  }
  const g = brand.gradient;
  const inner = radii.lg - 1.5;
  return (
    <Animated.View {...rest} style={[{ borderRadius: radii.lg, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 6 }, run ? halo : null]}>
      <View style={{ borderRadius: radii.lg, overflow: "hidden", padding: 1.5 }}>
        <LinearGradient pointerEvents="none" colors={[g[0], g[1], g[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {run ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, alt]}><LinearGradient colors={[g[2], g[1], g[0]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} /></Animated.View> : null}
        <View style={[{ backgroundColor: colors.surface, borderRadius: inner, padding: 16, overflow: "hidden" }, style]}>
          <LinearGradient pointerEvents="none" colors={[withAlpha(colors.primary, 0.12), withAlpha(g[2], 0.04)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {children}
        </View>
      </View>
    </Animated.View>
  );
}
