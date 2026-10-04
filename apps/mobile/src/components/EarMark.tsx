import { useEffect } from "react";
import Svg, { Defs, G, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import Animated, { cancelAnimation, Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The EAR mark: an ear with sound waves arriving from the side. `animated` makes the waves pulse inward in sequence. */
export function EarMark({ size = 64, animated = false }: { size?: number; animated?: boolean }) {
  const reduce = useReducedMotion();
  const w1 = useSharedValue(0.95);
  const w2 = useSharedValue(0.6);
  useEffect(() => {
    if (!animated || reduce) return;
    const pulse = (v: { value: number }, base: number, delay: number) => {
      v.value = withDelay(delay, withRepeat(withSequence(withTiming(0.12, { duration: 520, easing: Easing.out(Easing.quad) }), withTiming(base, { duration: 680, easing: Easing.in(Easing.quad) }), withTiming(base, { duration: 700 })), -1));
    };
    pulse(w2, 0.6, 0);
    pulse(w1, 0.95, 260);
    return () => { cancelAnimation(w1); cancelAnimation(w2); };
  }, [animated, reduce, w1, w2]);
  const p1 = useAnimatedProps(() => ({ opacity: w1.value }));
  const p2 = useAnimatedProps(() => ({ opacity: w2.value }));
  return (
    <Svg width={size} height={size} viewBox="-10 -3 76 76" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <SvgGradient id="earg" x1="14" y1="6" x2="62" y2="68" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ff7440" />
          <Stop offset="0.55" stopColor="#b24cff" />
          <Stop offset="1" stopColor="#6d62f2" />
        </SvgGradient>
      </Defs>
      <G stroke="url(#earg)" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M33 62c-5.5 0-9.5-3.6-9.5-9.2" strokeWidth={6.5} />
        <Path d="M33 62c7.6 0 10.5-6 10.5-12.2 0-8.8 11-12 11-24C54.5 14.2 46.4 7 36 7 24.5 7 16.5 15 16.5 27v6" strokeWidth={6.5} />
        <Path d="M29.5 31c0-5.2 3.6-8.6 8-8.6 4.3 0 7 3 7 7 0 6.6-7.6 7.3-8.8 13" strokeWidth={5} />
      </G>
      <G stroke="url(#earg)" strokeLinecap="round" strokeWidth={4}>
        <AnimatedPath d="M9 24.5c-2.8 3.7-2.8 8.3 0 12" animatedProps={p1} />
        <AnimatedPath d="M3.5 19c-5 6-5 15 0 21" animatedProps={p2} />
      </G>
    </Svg>
  );
}
