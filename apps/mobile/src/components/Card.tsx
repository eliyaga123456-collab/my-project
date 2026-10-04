import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { useTheme, withAlpha } from "@/theme";

export function Card({ children, style, glow, ...rest }: ViewProps & { style?: StyleProp<ViewStyle>; glow?: boolean }) {
  const { colors, radii } = useTheme();
  return (
    <View
      {...rest}
      style={[
        { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, borderWidth: glow ? 1.5 : StyleSheet.hairlineWidth, borderColor: glow ? colors.primary : colors.border },
        glow && { shadowColor: colors.primary, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 6, backgroundColor: withAlpha(colors.primary, 0.06) },
        style
      ]}
    >
      {children}
    </View>
  );
}
