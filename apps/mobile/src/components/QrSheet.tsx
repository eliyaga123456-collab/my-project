import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { BottomSheet } from "./BottomSheet";
import { QrCode } from "./QrCode";
import { Text } from "./Text";

/** A big, brand-colored QR of a link for scanning from another phone or printing. */
export function QrSheet({ visible, url, onClose, title }: { visible: boolean; url: string; onClose: () => void; title?: string }) {
  const { t } = useT();
  const { brand } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title ?? t("qr.title")}>
      <View style={{ alignItems: "center", gap: 12, paddingVertical: 6 }}>
        <LinearGradient colors={[brand.gradient[0], brand.gradient[1], brand.gradient[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 10, borderRadius: 26 }}>
          <QrCode value={url} size={236} radius={18} />
        </LinearGradient>
        <Text tone="muted" style={{ textAlign: "center" }}>{t("qr.hint")}</Text>
        <Text variant="caption" selectable style={{ writingDirection: "ltr" }}>{url.replace(/^https?:\/\//, "")}</Text>
      </View>
    </BottomSheet>
  );
}
