import { useEffect, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from "react-native-reanimated";

/** "Ink-drop" entrance: a springy rise + fade + settle (stagger with `delay`). Instant when reduce-motion is on. */
export function InkIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) p.value = withDelay(delay, withSpring(1, { damping: 16, stiffness: 150, mass: 0.8 }));
  }, [reduce, delay, p]);
  const a = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 1.6), transform: [{ translateY: (1 - p.value) * 18 }, { scale: 0.96 + p.value * 0.04 }] }));
  return <Animated.View style={[a, style]}>{children}</Animated.View>;
}

export { useReducedMotion };
