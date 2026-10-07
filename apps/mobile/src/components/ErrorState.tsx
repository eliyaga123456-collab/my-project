import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useTheme, withAlpha } from "@/theme";
import { useT } from "@/i18n";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Text } from "./Text";

export function ErrorState({ message, onRetry, offline }: { message: string; onRetry?: () => void; offline?: boolean }) {
  const { t } = useT();
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const shake = useSharedValue(0);
  // One quick head-shake when the error appears, then still.
  useEffect(() => { if (!reduce) shake.value = withSequence(withTiming(7, { duration: 60 }), withTiming(-7, { duration: 90 }), withTiming(5, { duration: 80 }), withTiming(-3, { duration: 70 }), withTiming(0, { duration: 60 })); }, [reduce, shake]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  return (
    <View accessibilityRole="alert" style={{ alignItems: "center", gap: 10, paddingVertical: 40, paddingHorizontal: 24 }}>
      <Animated.View style={[{ width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(colors.danger, 0.14), borderWidth: 1, borderColor: withAlpha(colors.danger, 0.4) }, a]}>
        <Icon name={offline ? "wifi-off" : "flag"} size={32} tone="danger" />
      </Animated.View>
      <Text variant="heading" style={{ textAlign: "center" }}>{offline ? t("network.youreOffline") : t("network.didntWork")}</Text>
      <Text tone="muted" style={{ textAlign: "center" }}>{message}</Text>
      {onRetry ? <Button title={t("common.tryAgain")} onPress={onRetry} small variant="secondary" icon={<Icon name="refresh" size={18} />} /> : null}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useT();
  return (
    <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, backgroundColor: "rgba(255,93,115,0.14)" }}>
      <Text variant="caption" tone="danger" style={{ flex: 1 }}>{message}</Text>
      {onRetry ? <Button title={t("common.retry")} onPress={onRetry} small variant="ghost" /> : null}
    </View>
  );
}
