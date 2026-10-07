import { Switch, View } from "react-native";
import { useTheme, withAlpha } from "@/theme";
import { haptic } from "@/lib/haptics";
import { Icon, type IconName } from "./Icon";
import { PressableScale } from "./Pressable";
import { Text } from "./Text";

export function SwitchRow({ label, description, value, onChange, disabled }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 6 }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? <Text variant="caption" tone="muted">{description}</Text> : null}
      </View>
      <Switch accessibilityLabel={label} value={value} disabled={disabled} onValueChange={(v) => { haptic.select(); onChange(v); }} trackColor={{ true: colors.primary, false: colors.border }} />
    </View>
  );
}

export function NavRow({ icon, label, detail, onPress }: { icon: IconName; label: string; detail?: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale depth={1} pressScale={0.985} accessibilityRole="button" accessibilityLabel={detail ? `${label}, ${detail}` : label} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(colors.secondary, 0.14) }}>
        <Icon name={icon} size={20} tone="secondary" />
      </View>
      <Text variant="bodyStrong" style={{ flex: 1 }}>{label}</Text>
      {detail ? <Text variant="caption" tone="muted">{detail}</Text> : null}
      <Icon name="chevron" size={18} tone="muted" />
    </PressableScale>
  );
}
