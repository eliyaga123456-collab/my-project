import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useT } from "@/i18n";
import { WordmarkLogo } from "./WordmarkLogo";

/** Brand moment shown right after the native splash: the ear appears, sound waves pulse, wordmark fades in, then everything lifts away. */
export function AnimatedSplash() {
  const { t } = useT();
  const reduce = useReducedMotion();
  const [gone, setGone] = useState(false);
  const opacity = useSharedValue(1);
  const logo = useSharedValue(reduce ? 1 : 0.8);
  const word = useSharedValue(reduce ? 1 : 0);
  const ring = useSharedValue(0);

  useEffect(() => {
    if (!reduce) {
      logo.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.back(1.6)) });
      word.value = withDelay(380, withTiming(1, { duration: 520 }));
      ring.value = withDelay(200, withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }));
    }
    const fade = setTimeout(() => { opacity.value = withTiming(0, { duration: 380 }); }, reduce ? 400 : 1800);
    const end = setTimeout(() => setGone(true), reduce ? 800 : 2250);
    return () => { clearTimeout(fade); clearTimeout(end); };
  }, [reduce, logo, word, ring, opacity]);

  const root = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logo.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 10 }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: (1 - ring.value) * 0.5, transform: [{ scale: 0.6 + ring.value * 1.6 }] }));
  if (gone) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, root]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.ring, ringStyle]} />
      <Animated.View style={logoStyle}><WordmarkLogo width={300} /></Animated.View>
      <Animated.View style={[styles.wordWrap, wordStyle]}>
        <Text style={styles.tag}>{t("brand.tagline")}</Text>
        <Text style={styles.dedication}>{t("brand.dedication")}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#0b0a14", alignItems: "center", justifyContent: "center", zIndex: 999, elevation: 999 },
  ring: { position: "absolute", width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: "#b24cff" },
  wordWrap: { alignItems: "center", marginTop: 6, gap: 6 },
  word: { color: "#f6f4ff", fontSize: 44, fontWeight: "800", letterSpacing: 1, writingDirection: "ltr" },
  star: { color: "#ff7440" },
  tag: { color: "#a8a3c2", fontSize: 16 },
  dedication: { color: "#6f6a8c", fontSize: 13, marginTop: 14 }
});
