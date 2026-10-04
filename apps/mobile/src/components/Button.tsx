import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, withAlpha } from "@/theme";
import { haptic } from "@/lib/haptics";
import { PressableScale } from "./Pressable";
import { Text } from "./Text";

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({ title, onPress, variant = "primary", loading, disabled, small, icon, style, accessibilityHint }: ButtonProps) {
  const { colors, brand, radii } = useTheme();
  const inactive = disabled || loading;
  const fg = variant === "primary" ? colors.primaryText : variant === "danger" ? colors.danger : colors.text;
  const bg =
    variant === "secondary" ? colors.surfaceRaised : variant === "danger" ? withAlpha(colors.danger, 0.14) : "transparent";
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => { haptic.tap(); onPress(); }}
      style={[{ minHeight: small ? 44 : 52, flexGrow: 0, borderRadius: radii.pill, overflow: "hidden", opacity: inactive ? 0.55 : 1, backgroundColor: bg }, variant === "ghost" && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, style]}
    >
      {variant === "primary" && (
        <LinearGradient colors={[brand.gradient[0], brand.gradient[1], brand.gradient[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      <View style={{ minHeight: small ? 44 : 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: small ? 16 : 24, paddingVertical: 10 }}>
        {loading ? <ActivityIndicator color={fg} /> : icon}
        <Text variant="bodyStrong" maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ flexShrink: 1, textAlign: "center", color: variant === "primary" ? "#fff" : fg }}>{title}</Text>
      </View>
    </PressableScale>
  );
}
