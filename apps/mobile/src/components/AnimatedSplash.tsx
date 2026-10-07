import { useEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { WordmarkLogo } from "./WordmarkLogo";

const { width: W, height: H } = Dimensions.get("window");
const SHOW_MS = 3200;
const EXIT_MS = 560;
const LOGO_W = Math.min(W * 0.78, 330);

/** Four-point sparkle, like the stars in the wordmark. */
const STAR = "M12 0 C12.8 7.2 16.8 11.2 24 12 C16.8 12.8 12.8 16.8 12 24 C11.2 16.8 7.2 12.8 0 12 C7.2 11.2 11.2 7.2 12 0Z";
function Star({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={STAR} fill={color} /></Svg>;
}

/** Soft colored light blob that drifts slowly: the aurora behind the logo. */
function Blob({ id, color, size, x, y, drift, delay, alpha }: { id: string; color: string; size: number; x: number; y: number; drift: number; delay: number; alpha: number }) {
  const t = useSharedValue(0);
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.value = withDelay(delay, withTiming(1, { duration: 900 }));
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [t, fade, delay]);
  const st = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateX: (t.value - 0.5) * drift }, { translateY: (0.5 - t.value) * drift * 0.7 }, { scale: 0.9 + t.value * 0.25 }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size }, st]}>
      <Svg width={size} height={size}>
        <Defs><RadialGradient id={id} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={color} stopOpacity={alpha} /><Stop offset="1" stopColor={color} stopOpacity="0" /></RadialGradient></Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** One sound-wave ring that expands from the ear and fades. */
function Ring({ color, delay, size }: { color: string; delay: number; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.cubic) }), -1, false)); }, [p, delay]);
  const st = useAnimatedStyle(() => ({ opacity: (1 - p.value) * 0.55, transform: [{ scale: 0.4 + p.value * 2.2 }] }));
  return <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }, st]} />;
}

/** A star that circles the logo on an ellipse and twinkles. `orbit` runs 0..1 forever. */
function Orbiter({ orbit, phase, rx, ry, size, color }: { orbit: { value: number }; phase: number; rx: number; ry: number; size: number; color: string }) {
  const st = useAnimatedStyle(() => {
    const a = (orbit.value + phase) * Math.PI * 2;
    const tw = 0.55 + 0.45 * Math.sin(a * 2 + phase * 9);
    return { opacity: tw, transform: [{ translateX: Math.cos(a) * rx }, { translateY: Math.sin(a) * ry }, { rotate: `${a * 60}deg` }, { scale: 0.6 + tw * 0.6 }] };
  });
  return <Animated.View style={[{ position: "absolute", marginStart: -size / 2, marginTop: -size / 2, shadowColor: color, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }, st]}><Star size={size} color={color} /></Animated.View>;
}

/** A sparkle that flies outward from the centre. */
function Spark({ angle, dist, size, color, delay }: { angle: number; dist: number; size: number; color: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) })); }, [p, delay]);
  const st = useAnimatedStyle(() => ({
    opacity: p.value < 0.15 ? p.value / 0.15 : 1 - (p.value - 0.15) / 0.85,
    transform: [{ translateX: Math.cos(angle) * dist * p.value }, { translateY: Math.sin(angle) * dist * p.value }, { rotate: `${p.value * 200}deg` }, { scale: 1 - p.value * 0.4 }]
  }));
  return <Animated.View style={[{ position: "absolute" }, st]}><Star size={size} color={color} /></Animated.View>;
}

/** Brand moment right after the native splash: aurora light, sound waves, a glowing wordmark with a light sweep, orbiting stars and a zoom-through exit. Theme-aware. */
export function AnimatedSplash() {
  const { t } = useT();
  const { name, colors } = useTheme();
  const dark = name === "dark";
  const reduce = useReducedMotion();
  const [gone, setGone] = useState(false);
  const exit = useSharedValue(0);
  const logo = useSharedValue(reduce ? 1 : 0);
  const glow = useSharedValue(0);
  const tag = useSharedValue(reduce ? 1 : 0);
  const float = useSharedValue(0);
  const sweep = useSharedValue(0);
  const orbit = useSharedValue(0);

  const PINK = dark ? "#ff4fa3" : "#ff5fa8", VIOLET = dark ? "#8a3dff" : "#8b6cf0", EMBER = dark ? "#ff8a3d" : "#ffb347", SKY = dark ? "#b58cff" : "#c9b6ff";
  const bg = dark ? "#0b0614" : "#fff7fb";

  const sparks = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
    return { key: i, angle: (i / 22) * Math.PI * 2 + r(1) * 0.4, dist: 120 + r(2) * Math.min(W, H) * 0.42, size: 9 + r(3) * 15, color: [PINK, VIOLET, EMBER, SKY, dark ? "#ffffff" : "#ff8fc8"][i % 5]!, delay: 560 + r(4) * 280 };
  }), [PINK, VIOLET, EMBER, SKY, dark]);

  useEffect(() => {
    if (!reduce) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      logo.value = withDelay(250, withTiming(1, { duration: 950, easing: Easing.out(Easing.back(1.7)) }));
      glow.value = withDelay(350, withSequence(withTiming(1, { duration: 700 }), withRepeat(withSequence(withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1)));
      tag.value = withDelay(1100, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
      float.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true);
      sweep.value = withDelay(1000, withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }), withDelay(700, withTiming(0, { duration: 0 }))), -1));
      orbit.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.linear }), -1, false);
    }
    const out = setTimeout(() => { exit.value = withTiming(1, { duration: EXIT_MS, easing: Easing.in(Easing.cubic) }); }, reduce ? 400 : SHOW_MS - EXIT_MS);
    const end = setTimeout(() => setGone(true), reduce ? 800 : SHOW_MS + 60);
    return () => { clearTimeout(out); clearTimeout(end); };
  }, [reduce, logo, glow, tag, float, exit, sweep, orbit]);

  const root = useAnimatedStyle(() => ({ opacity: 1 - exit.value * exit.value }));
  const stage = useAnimatedStyle(() => ({ transform: [{ scale: 1 + exit.value * exit.value * 2.4 }] }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value, transform: [{ translateY: (float.value - 0.5) * 8 }, { scale: 0.55 + logo.value * 0.45 }, { rotate: `${(1 - logo.value) * -8}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.95, transform: [{ scale: 0.8 + glow.value * 0.35 }] }));
  const sweepStyle = useAnimatedStyle(() => ({ opacity: sweep.value > 0 ? 0.9 : 0, transform: [{ translateX: -LOGO_W * 0.5 + sweep.value * LOGO_W * 1.4 }, { skewX: "-20deg" }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ translateY: (1 - tag.value) * 14 }] }));
  const dedStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, tag.value * 2 - 1) }));
  if (gone) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: bg }, root]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {!reduce && (
        <>
          <Blob id="b1" color={VIOLET} size={W * 1.3} x={W * 0.2} y={H * 0.3} drift={90} delay={0} alpha={dark ? 0.55 : 0.4} />
          <Blob id="b2" color={PINK} size={W * 1.2} x={W * 0.85} y={H * 0.6} drift={110} delay={150} alpha={dark ? 0.5 : 0.35} />
          <Blob id="b3" color={EMBER} size={W * 0.9} x={W * 0.5} y={H * 0.88} drift={70} delay={300} alpha={dark ? 0.45 : 0.4} />
          <Blob id="b4" color={SKY} size={W * 0.8} x={W * 0.15} y={H * 0.85} drift={80} delay={450} alpha={dark ? 0.35 : 0.4} />
        </>
      )}
      <Animated.View style={[styles.center, stage]}>
        {!reduce && (
          <>
            <Ring color={PINK} delay={300} size={200} />
            <Ring color={VIOLET} delay={900} size={200} />
            <Ring color={EMBER} delay={1500} size={200} />
            {sparks.map(({ key, ...s }) => <Spark key={key} {...s} />)}
            <Animated.View style={[styles.glow, glowStyle]}>
              <Svg width={460} height={460}>
                <Defs><RadialGradient id="gl" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={PINK} stopOpacity={dark ? 0.7 : 0.45} /><Stop offset="0.5" stopColor={dark ? EMBER : VIOLET} stopOpacity={dark ? 0.22 : 0.18} /><Stop offset="1" stopColor={VIOLET} stopOpacity="0" /></RadialGradient></Defs>
                <Rect width={460} height={460} fill="url(#gl)" />
              </Svg>
            </Animated.View>
          </>
        )}
        <Animated.View style={logoStyle}>
          <View style={{ width: LOGO_W, alignItems: "center", justifyContent: "center" }}>
            <WordmarkLogo width={LOGO_W} />
            {!reduce && (
              <View style={[StyleSheet.absoluteFill, { overflow: "hidden", borderRadius: 24 }]} pointerEvents="none">
                <Animated.View style={[{ position: "absolute", top: -10, bottom: -10, width: 70 }, sweepStyle]}>
                  <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.75)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
                </Animated.View>
              </View>
            )}
            {!reduce && (
              <View style={styles.orbitHost} pointerEvents="none">
                <Orbiter orbit={orbit} phase={0} rx={LOGO_W * 0.55} ry={LOGO_W * 0.22} size={22} color={PINK} />
                <Orbiter orbit={orbit} phase={0.27} rx={LOGO_W * 0.5} ry={LOGO_W * 0.3} size={16} color={EMBER} />
                <Orbiter orbit={orbit} phase={0.52} rx={LOGO_W * 0.58} ry={LOGO_W * 0.18} size={26} color={dark ? "#ffffff" : VIOLET} />
                <Orbiter orbit={orbit} phase={0.77} rx={LOGO_W * 0.46} ry={LOGO_W * 0.28} size={13} color={SKY} />
              </View>
            )}
          </View>
        </Animated.View>
        <View style={styles.textWrap}>
          <Animated.Text style={[styles.tag, { color: colors.text }, tagStyle]}>{t("brand.tagline")}</Animated.Text>
          <Animated.Text style={[styles.dedication, { color: PINK }, dedStyle]}>{t("brand.dedication")}</Animated.Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", zIndex: 999, elevation: 999, overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 460, height: 460 },
  orbitHost: { position: "absolute", top: "50%", start: "50%", width: 0, height: 0, alignItems: "center", justifyContent: "center" },
  textWrap: { alignItems: "center", marginTop: 10, gap: 6 },
  tag: { fontSize: 17, fontWeight: "600" },
  dedication: { fontSize: 14, marginTop: 14 }
});
