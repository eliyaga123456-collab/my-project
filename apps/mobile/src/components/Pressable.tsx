import type { ReactNode } from "react";
import { Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

interface Props extends Omit<PressableProps, "style" | "children"> {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Pixels the control sinks while pressed (design: buttons depress 2px). */
  depth?: number;
}

/** Pressable with a 2px "depress" animation (skipped under reduce-motion). */
export function PressableScale({ style, children, depth = 2, onPressIn, onPressOut, ...rest }: Props) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => { if (!reduce) y.value = withTiming(depth, { duration: 80 }); onPressIn?.(e); }}
      onPressOut={(e) => { if (!reduce) y.value = withTiming(0, { duration: 140 }); onPressOut?.(e); }}
      style={[a, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
