import { useEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useT } from "@/i18n";
import { WordmarkLogo } from "./WordmarkLogo";

const { width: W, height: H } = Dimensions.get("window");
const PINK = "#ff4fa3", VIOLET = "#9b5cff", EMBER = "#ff7440", SKY = "#46c8ff";
const SHOW_MS = 3000;

/** Soft colored light blob (SVG radial gradient) that drifts slowly: the aurora behind the logo. */
function Blob({ color, size, x, y, drift, delay }: { color: string; size: number; x: number; y: number; drift: number; delay: number }) {
  const t = useSharedValue(0);
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.value = withDelay(delay, withTiming(1, { duration: 900 }));
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [t, fade, delay]);
  const st = useAnimatedStyle(() => ({ opacity: fade.value * 0.85, transform: [{ translateX: (t.value - 0.5) * drift }, { translateY: (0.5 - t.value) * drift * 0.7 }, { scale: 0.9 + t.value * 0.25 }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size }, st]}>
      <Svg width={size} height={size}>
        <Defs><RadialGradient id="g" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={color} stopOpacity="0.55" /><Stop offset="1" stopColor={color} stopOpacity="0" /></RadialGradient></Defs>
        <Rect width={size} height={size} fill="url(#g)" />
      </Svg>
    </Animated.View>
  );
}

/** One sound-wave ring that expands from the ear and fades. */
function Ring({ color, delay, size }: { color: string; delay: number; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1700, easing: Easing.out(Easing.cubic) }), -1, false)); }, [p, delay]);
  const st = useAnimatedStyle(() => ({ opacity: (1 - p.value) * 0.7, transform: [{ scale: 0.35 + p.value * 2.1 }] }));
  return <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: color }, st]} />;
}

/** A sparkle that flies outward from the centre. */
function Spark({ angle, dist, size, color, delay }: { angle: number; dist: number; size: number; color: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) })); }, [p, delay]);
  const st = useAnimatedStyle(() => ({
    opacity: p.value < 0.15 ? p.value / 0.15 : 1 - (p.value - 0.15) / 0.85,
    transform: [{ translateX: Math.cos(angle) * dist * p.value }, { translateY: Math.sin(angle) * dist * p.value }, { rotate: `${p.value * 180}deg` }, { scale: 1 - p.value * 0.4 }]
  }));
  return <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size * 0.2, backgroundColor: color, shadowColor: color, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 }, st]} />;
}

/** Brand moment right after the native splash: aurora light, expanding sound waves, a burst of sparks, a glowing logo and a zoom-through exit. */
export function AnimatedSplash() {
  const { t } = useT();
  const reduce = useReducedMotion();
  const [gone, setGone] = useState(false);
  const exit = useSharedValue(0);
  const logo = useSharedValue(reduce ? 1 : 0);
  const glow = useSharedValue(0);
  const tag = useSharedValue(reduce ? 1 : 0);
  const float = useSharedValue(0);

  const sparks = useMemo(() => Array.from({ length: 26 }, (_, i) => {
    const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
    return { key: i, angle: (i / 26) * Math.PI * 2 + r(1) * 0.4, dist: 110 + r(2) * Math.min(W, H) * 0.42, size: 4 + r(3) * 7, color: [PINK, VIOLET, EMBER, SKY, "#ffffff"][i % 5]!, delay: 520 + r(4) * 260 };
  }), []);

  useEffect(() => {
    if (!reduce) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      logo.value = withDelay(250, withTiming(1, { duration: 900, easing: Easing.out(Easing.back(1.9)) }));
      glow.value = withDelay(350, withSequence(withTiming(1, { duration: 700 }), withRepeat(withSequence(withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1)));
      tag.value = withDelay(1050, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
      float.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
    }
    const out = setTimeout(() => { exit.value = withTiming(1, { duration: 520, easing: Easing.in(Easing.cubic) }); }, reduce ? 400 : SHOW_MS - 520);
    const end = setTimeout(() => setGone(true), reduce ? 800 : SHOW_MS + 60);
    return () => { clearTimeout(out); clearTimeout(end); };
  }, [reduce, logo, glow, tag, float, exit]);

  const root = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const stage = useAnimatedStyle(() => ({ transform: [{ scale: 1 + exit.value * 0.6 }] }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value, transform: [{ translateY: (float.value - 0.5) * 8 }, { scale: 0.55 + logo.value * 0.45 }, { rotate: `${(1 - logo.value) * -8}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.9, transform: [{ scale: 0.8 + glow.value * 0.35 }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value, letterSpacing: 6 - tag.value * 5, transform: [{ translateY: (1 - tag.value) * 14 }] }));
  const dedStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, tag.value * 2 - 1) }));
  if (gone) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, root]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {!reduce && (
        <>
          <Blob color={VIOLET} size={W * 1.3} x={W * 0.2} y={H * 0.3} drift={90} delay={0} />
          <Blob color={PINK} size={W * 1.2} x={W * 0.85} y={H * 0.6} drift={110} delay={150} />
          <Blob color={EMBER} size={W * 0.9} x={W * 0.5} y={H * 0.88} drift={70} delay={300} />
          <Blob color={SKY} size={W * 0.8} x={W * 0.15} y={H * 0.85} drift={80} delay={450} />
        </>
      )}
      <Animated.View style={[styles.center, stage]}>
        {!reduce && (
          <>
            <Ring color={PINK} delay={300} size={200} />
            <Ring color={VIOLET} delay={800} size={200} />
            <Ring color={EMBER} delay={1300} size={200} />
            {sparks.map(({ key, ...s }) => <Spark key={key} {...s} />)}
            <Animated.View style={[styles.glow, glowStyle]}>
              <Svg width={420} height={420}>
                <Defs><RadialGradient id="gl" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={PINK} stopOpacity="0.7" /><Stop offset="0.5" stopColor={VIOLET} stopOpacity="0.25" /><Stop offset="1" stopColor={VIOLET} stopOpacity="0" /></RadialGradient></Defs>
                <Rect width={420} height={420} fill="url(#gl)" />
              </Svg>
            </Animated.View>
          </>
        )}
        <Animated.View style={logoStyle}><WordmarkLogo width={Math.min(W * 0.8, 320)} /></Animated.View>
        <View style={styles.textWrap}>
          <Animated.Text style={[styles.tag, tagStyle]}>{t("brand.tagline")}</Animated.Text>
          <Animated.Text style={[styles.dedication, dedStyle]}>{t("brand.dedication")}</Animated.Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#0b0a14", alignItems: "center", justifyContent: "center", zIndex: 999, elevation: 999, overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 420, height: 420 },
  textWrap: { alignItems: "center", marginTop: 10, gap: 6 },
  tag: { color: "#d9d4f5", fontSize: 17, fontWeight: "600" },
  dedication: { color: "#ff9ccb", fontSize: 14, marginTop: 14 }
});
