import type { ComponentProps } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import { haptic } from "@/lib/haptics";
import { PressableScale } from "./Pressable";
import { Icon, type IconName } from "./Icon";

interface Props { icon: IconName; label: string; onPress: () => void; size?: number; tone?: ComponentProps<typeof Icon>["tone"]; filled?: boolean; style?: StyleProp<ViewStyle>; disabled?: boolean }

export function IconButton({ icon, label, onPress, size = 22, tone = "text", filled, style, disabled }: Props) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={4}
      onPress={() => { haptic.tap(); onPress(); }}
      style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : 1 }, filled && { backgroundColor: colors.surfaceRaised, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, style]}
    >
      <Icon name={icon} size={size} tone={tone} />
    </PressableScale>
  );
}
