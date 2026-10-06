import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

const { width: W, height: H } = Dimensions.get("window");

function Glow({ color, size, x, y, drift, ms, opacity }: { color: string; size: number; x: number; y: number; drift: number; ms: number; opacity: number }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0.5);
  useEffect(() => { if (!reduce) t.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true); }, [t, ms, reduce]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: (t.value - 0.5) * drift }, { translateY: (0.5 - t.value) * drift * 0.8 }, { scale: 0.92 + (t.value - 0.5) * 0.3 }] }));
  const id = `a${color.slice(1)}`;
  return (
    <Animated.View style={[{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, opacity }, st]}>
      <Svg width={size} height={size}>
        <Defs><RadialGradient id={id} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={color} stopOpacity="0.5" /><Stop offset="1" stopColor={color} stopOpacity="0" /></RadialGradient></Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Slowly drifting pink / violet / ember light behind a screen (decorative, non-interactive). */
export function AuroraBackground({ strength = 1 }: { strength?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Glow color="#9b5cff" size={W * 1.2} x={W * 0.1} y={H * 0.15} drift={80} ms={5200} opacity={0.55 * strength} />
      <Glow color="#ff4fa3" size={W * 1.1} x={W * 0.95} y={H * 0.45} drift={100} ms={6400} opacity={0.5 * strength} />
      <Glow color="#ff7440" size={W * 0.9} x={W * 0.3} y={H * 0.95} drift={70} ms={7200} opacity={0.4 * strength} />
    </View>
  );
}
