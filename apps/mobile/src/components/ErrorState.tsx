import { View } from "react-native";
import { useT } from "@/i18n";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Text } from "./Text";

export function ErrorState({ message, onRetry, offline }: { message: string; onRetry?: () => void; offline?: boolean }) {
  const { t } = useT();
  return (
    <View accessibilityRole="alert" style={{ alignItems: "center", gap: 10, paddingVertical: 40, paddingHorizontal: 24 }}>
      <Icon name={offline ? "wifi-off" : "flag"} size={36} tone="danger" />
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
