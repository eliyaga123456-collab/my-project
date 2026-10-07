import type { ReactNode } from "react";
import { Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

interface Props extends Omit<PressableProps, "style" | "children"> {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Pixels the control sinks while pressed (design: buttons depress 2px). */
  depth?: number;
  /** Scale reached while pressed (1 = no squish). Large cards should stay close to 1. */
  pressScale?: number;
}

/** Pressable with a springy squish + depress animation on the UI thread (skipped under reduce-motion). */
export function PressableScale({ style, children, depth = 2, pressScale = 0.97, onPressIn, onPressOut, ...rest }: Props) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: p.value * depth }, { scale: 1 - p.value * (1 - pressScale) }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => { if (!reduce) p.value = withSpring(1, { damping: 18, stiffness: 520 }); onPressIn?.(e); }}
      onPressOut={(e) => { if (!reduce) p.value = withSpring(0, { damping: 9, stiffness: 280 }); onPressOut?.(e); }}
      style={[a, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
