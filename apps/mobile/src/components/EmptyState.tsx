import { View } from "react-native";
import { useTheme, withAlpha } from "@/theme";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

export function EmptyState({ icon = "inbox", title, body, actionLabel, onAction }: { icon?: IconName; title: string; body?: string; actionLabel?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={`${title}. ${body ?? ""}`} style={{ alignItems: "center", gap: 10, paddingVertical: 40, paddingHorizontal: 24 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(colors.secondary, 0.14) }}>
        <Icon name={icon} size={32} tone="secondary" />
      </View>
      <Text variant="heading" style={{ textAlign: "center" }}>{title}</Text>
      {body ? <Text tone="muted" style={{ textAlign: "center" }}>{body}</Text> : null}
      {actionLabel && onAction ? <View style={{ marginTop: 8 }}><Button title={actionLabel} onPress={onAction} small /></View> : null}
    </View>
  );
}
