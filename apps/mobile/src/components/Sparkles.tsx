import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme";

const STAR = "M12 0 C12.8 7.2 16.8 11.2 24 12 C16.8 12.8 12.8 16.8 12 24 C11.2 16.8 7.2 12.8 0 12 C7.2 11.2 11.2 7.2 12 0Z";
const hidden = { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" } as const;

function Star({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={STAR} fill={color} /></Svg>;
}

interface P { dx: number; dy: number; size: number; rot: number; color: string; round: boolean }

/** Deterministic pseudo-random so a burst looks the same on every render (and costs no Math.random in render). */
function makeParticles(n: number, colors: string[], spread: number): P[] {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.5;
    const d = spread * (0.55 + rnd() * 0.5);
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, size: 8 + rnd() * 10, rot: (rnd() - 0.5) * 540, color: colors[i % colors.length]!, round: i % 3 === 0 };
  });
}

function Particle({ p, prog }: { p: P; prog: { value: number } }) {
  const style = useAnimatedStyle(() => {
    const v = prog.value;
    const e = 1 - (1 - v) * (1 - v) * (1 - v);
    return {
      opacity: v < 0.08 ? v / 0.08 : 1 - v * v,
      transform: [{ translateX: p.dx * e }, { translateY: p.dy * e + v * v * 46 }, { rotate: `${p.rot * v}deg` }, { scale: 1 - v * 0.45 }]
    };
  });
  return (
    <Animated.View style={[{ position: "absolute" }, style]}>
      {p.round ? <View style={{ width: p.size * 0.55, height: p.size * 0.55, borderRadius: p.size, backgroundColor: p.color }} /> : <Star size={p.size} color={p.color} />}
    </Animated.View>
  );
}

/**
 * Confetti / sparkle burst from the centre of its (absolute, non-interactive) container.
 * Fires every time `trigger` increases; renders nothing until then. Skipped under reduce-motion.
 */
export function SparkleBurst({ trigger, count = 22, spread = 150, top = "40%" }: { trigger: number; count?: number; spread?: number; top?: `${number}%` | number }) {
  const reduce = useReducedMotion();
  const { brand } = useTheme();
  const prog = useSharedValue(1);
  const parts = useMemo(() => makeParticles(count, [brand.gradient[0], brand.gradient[1], brand.gradient[2], "#ffe9a8", "#ffffff"], spread), [count, spread, brand]);
  useEffect(() => {
    if (!trigger || reduce) return;
    prog.value = 0;
    prog.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) });
  }, [trigger, reduce, prog]);
  if (!trigger || reduce) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", top: top as number }]} {...hidden}>
      {/* key remounts the particles so a repeated burst restarts cleanly */}
      <View key={trigger} style={{ width: 1, height: 1 }}>{parts.map((p, i) => <Particle key={i} p={p} prog={prog} />)}</View>
    </View>
  );
}

const SPOTS = [
  { x: 0.08, y: 0.12, s: 14, ph: 0 }, { x: 0.86, y: 0.06, s: 10, ph: 1.7 }, { x: 0.94, y: 0.62, s: 16, ph: 3.1 }, { x: 0.02, y: 0.7, s: 9, ph: 4.4 }, { x: 0.5, y: -0.04, s: 8, ph: 5.5 }
];

function Twinkle({ t, spot, color }: { t: { value: number }; spot: (typeof SPOTS)[number]; color: string }) {
  const style = useAnimatedStyle(() => {
    const w = 0.5 + 0.5 * Math.sin(t.value * Math.PI * 2 + spot.ph);
    return { opacity: 0.25 + w * 0.75, transform: [{ scale: 0.6 + w * 0.5 }, { rotate: `${w * 40}deg` }, { translateY: -w * 4 }] };
  });
  return <Animated.View style={[{ position: "absolute", start: `${spot.x * 100}%`, top: `${spot.y * 100}%` }, style]}><Star size={spot.s} color={color} /></Animated.View>;
}

/** A handful of slowly twinkling stars around its parent (parent must be position-relative). One shared value drives all. */
export function FloatingSparkles({ color }: { color?: string }) {
  const reduce = useReducedMotion();
  const { brand } = useTheme();
  const t = useSharedValue(0);
  useEffect(() => { if (!reduce) t.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.linear }), -1, false); }, [reduce, t]);
  const c = color ?? brand.gradient[1];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} {...hidden}>
      {SPOTS.map((s, i) => <Twinkle key={i} t={t} spot={s} color={i % 2 ? "#ffd27a" : c} />)}
    </View>
  );
}
