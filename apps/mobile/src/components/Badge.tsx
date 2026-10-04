import { View } from "react-native";
import { useTheme, withAlpha, type Colors } from "@/theme";
import { Text } from "./Text";

export function Badge({ label, tone = "secondary" }: { label: string; tone?: keyof Pick<Colors, "primary" | "secondary" | "success" | "warning" | "danger" | "muted"> }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={label} style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: withAlpha(colors[tone], 0.16) }}>
      <Text variant="label" style={{ color: colors[tone], fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export function CountDot({ count }: { count: number }) {
  const { colors } = useTheme();
  if (count <= 0) return null;
  return (
    <View accessibilityElementsHidden style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
      <Text variant="label" style={{ color: colors.primaryText, fontSize: 10, letterSpacing: 0 }}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}
