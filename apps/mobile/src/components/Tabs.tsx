import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, withAlpha } from "@/theme";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptics";
import { PressableScale } from "./Pressable";
import { Text } from "./Text";

export interface SegmentOption<T extends string> { value: T; label: string }

const PAD = 4;

/** Segmented control (Inbox / Filtered / Archived) with a glossy pill that springs between segments. */
export function Tabs<T extends string>({ options, value, onChange }: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void }) {
  const { colors, radii, brand } = useTheme();
  const { isRTL } = useT();
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const segW = w > 0 ? (w - PAD * 2) / options.length : 0;
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const target = (isRTL ? -idx : idx) * segW;
  // Snap on first measure, spring afterwards (translateX is physical: RTL lays the first option on the right).
  const placed = useRef(false);
  useEffect(() => {
    if (segW <= 0) return;
    if (!placed.current || reduce) { x.value = target; placed.current = true; } else x.value = withSpring(target, { damping: 17, stiffness: 240 });
  }, [segW, target, reduce, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View accessibilityRole="tablist" onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: "row", backgroundColor: colors.surface, borderRadius: radii.pill, padding: PAD, borderWidth: 1, borderColor: colors.border }}>
      {segW > 0 ? (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: PAD, bottom: PAD, start: PAD, width: segW, borderRadius: radii.pill, overflow: "hidden", borderWidth: 1, borderColor: withAlpha(colors.primary, 0.5) }, pill]}>
          <LinearGradient colors={[withAlpha(brand.gradient[1], 0.34), withAlpha(brand.gradient[2], 0.2)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
          <LinearGradient colors={["rgba(255,255,255,0.28)", "transparent"]} style={{ position: "absolute", top: 0, start: 0, end: 0, height: "55%" }} />
        </Animated.View>
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale
            key={o.value}
            depth={1}
            pressScale={0.96}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            onPress={() => { if (!active) { haptic.select(); onChange(o.value); } }}
            style={{ flex: 1, minHeight: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" }}
          >
            <Text variant="bodyStrong" tone={active ? "primary" : "muted"} style={{ fontSize: 14 }}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
