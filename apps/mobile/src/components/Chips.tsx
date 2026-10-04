import { ScrollView, View } from "react-native";
import { useTheme, withAlpha } from "@/theme";
import { haptic } from "@/lib/haptics";
import { PressableScale } from "./Pressable";
import { Text } from "./Text";

export interface ChipOption<T extends string> { value: T; label: string }

/** Single-select chips. `scroll` makes them a horizontally scrolling row (filters). */
export function Chips<T extends string>({ options, value, onChange, scroll = false, label }: { options: ChipOption<T>[]; value: T; onChange: (v: T) => void; scroll?: boolean; label: string }) {
  const { colors, radii } = useTheme();
  const items = options.map((o) => {
    const active = o.value === value;
    return (
      <PressableScale
        key={o.value}
        depth={1}
        accessibilityRole="radio"
        accessibilityLabel={o.label}
        accessibilityState={{ selected: active, checked: active }}
        onPress={() => { if (!active) { haptic.select(); onChange(o.value); } }}
        style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: active ? "transparent" : colors.border, backgroundColor: active ? withAlpha(colors.primary, 0.9) : "transparent" }}
      >
        <Text variant="bodyStrong" style={{ fontSize: 14, color: active ? colors.primaryText : colors.muted }}>{o.label}</Text>
      </PressableScale>
    );
  });
  if (scroll) return <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" accessibilityLabel={label} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>{items}</ScrollView>;
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{items}</View>;
}
