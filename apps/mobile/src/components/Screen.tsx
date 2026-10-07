import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, withAlpha } from "@/theme";
import { AuroraBackground } from "./AuroraBackground";

interface Props {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Reserve room for the custom tab bar. */
  tabs?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  bloom?: boolean;
  /** Drifting colour glow behind the content (default on, softer than the welcome screen). */
  aurora?: boolean;
  /** Rendered above the content, non-interactive unless it handles touches itself (e.g. a sparkle burst). */
  overlay?: ReactNode;
}

/** Themed, safe-area aware, keyboard-avoiding page container with a soft light bloom. */
export function Screen({ children, scroll = true, refreshing, onRefresh, tabs, contentStyle, bloom = true, aurora = true, overlay }: Props) {
  const { colors, palette } = useTheme();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = { paddingTop: insets.top + 12, paddingBottom: (tabs ? 96 : 24) + (tabs ? 0 : insets.bottom), paddingHorizontal: 20 };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {aurora ? <AuroraBackground strength={0.45} /> : null}
      {bloom && (
        <LinearGradient pointerEvents="none" colors={[withAlpha(palette.mist[500], 0.28), "transparent"]} style={{ position: "absolute", top: 0, start: 0, end: 0, height: 280 }} />
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[pad, { gap: 16 }, contentStyle]}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
      {overlay}
    </View>
  );
}
