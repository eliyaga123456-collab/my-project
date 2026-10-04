import { View } from "react-native";
import { Button } from "./Button";
import { Text } from "./Text";
import { useT } from "@/i18n";
import { type ShareTarget, needsClipboard } from "@/lib/share";
import { shareTo } from "@/lib/shareTo";
import { haptic } from "@/lib/haptics";
import { useToast } from "./Toast";

const TARGETS: { id: ShareTarget; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" }
];

/** One-tap share of a link to WhatsApp / Instagram / TikTok, plus the system share sheet ("More"). */
export function ShareTargets({ text, url, onMore }: { text: string; url: string; onMore: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const go = async (id: ShareTarget, label: string) => {
    haptic.tap();
    const r = await shareTo(id, text, url);
    if (r === "failed") toast.show(t("share.openFailed", { app: label }), "error");
    else if (needsClipboard(id)) toast.show(t("share.pasteIn", { app: label }), "success");
  };
  return (
    <View style={{ gap: 8 }}>
      <Text variant="caption" tone="muted">{t("share.shareTo")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {TARGETS.map((x) => (
          <Button key={x.id} title={x.label} small variant="secondary" onPress={() => void go(x.id, x.label)} style={{ flexGrow: 1, flexBasis: "30%" }} />
        ))}
        <Button title={t("share.more")} small variant="ghost" onPress={onMore} style={{ flexGrow: 1, flexBasis: "30%" }} />
      </View>
    </View>
  );
}
