import { View } from "react-native";
import { useTheme, withAlpha } from "@/theme";
import { haptic } from "@/lib/haptics";
import { PressableScale } from "./Pressable";
import { Text } from "./Text";

export interface SegmentOption<T extends string> { value: T; label: string }

/** Segmented control (Inbox / Filtered / Archived). */
export function Tabs<T extends string>({ options, value, onChange }: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void }) {
  const { colors, radii } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: colors.surface, borderRadius: radii.pill, padding: 4, borderWidth: 1, borderColor: colors.border }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale
            key={o.value}
            depth={1}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            onPress={() => { if (!active) { haptic.select(); onChange(o.value); } }}
            style={{ flex: 1, minHeight: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: active ? withAlpha(colors.primary, 0.18) : "transparent" }}
          >
            <Text variant="bodyStrong" tone={active ? "primary" : "muted"} style={{ fontSize: 14 }}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
