import { View } from "react-native";
import { useRouter } from "expo-router";
import { EarMark } from "@/components/EarMark";
import { Button } from "@/components/Button";
import { LanguagePicker } from "@/components/LanguagePicker";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { InkIn } from "@/theme/motion";
import { LRI, PDI, useT } from "@/i18n";

export default function Welcome() {
  const router = useRouter();
  const { t } = useT();
  const taglineLines = t("brand.tagline").split(" ");
  // Break the tagline roughly in half for the big display type (English "Say what you / really think.").
  const mid = Math.ceil(taglineLines.length / 2);
  const tagline = `${taglineLines.slice(0, mid).join(" ")}\n${taglineLines.slice(mid).join(" ")}`;
  return (
    <Screen scroll={false} contentStyle={{ justifyContent: "space-between" }}>
      <View>
        <LanguagePicker align="end" />
        <InkIn style={{ marginTop: 28, gap: 20 }}>
        <EarMark size={104} animated />
        <View accessible accessibilityLabel={t("brand.wordmarkLabel")}>
          {/* The wordmark is Latin: isolate it as LTR so the asterisk stays on its right in a Hebrew (RTL) layout. */}
          <Text variant="display" style={{ fontSize: 56, lineHeight: 60 }}>{LRI}EAR<Text variant="display" tone="primary" style={{ fontSize: 28, lineHeight: 36 }}>*</Text>{PDI}</Text>
          <Text tone="muted" style={{ fontSize: 14, letterSpacing: 0.3 }}>{t("brand.fullName")}</Text>
        </View>
        <Text variant="display" style={{ fontSize: 40, lineHeight: 44 }}>{tagline}</Text>
        <Text tone="muted" style={{ fontSize: 18, lineHeight: 27 }}>{t("welcome.intro")}</Text>
        </InkIn>
      </View>
      <InkIn delay={120} style={{ gap: 12 }}>
        <Button title={t("welcome.createLink")} onPress={() => router.push("/signup")} />
        <Button title={t("welcome.haveAccount")} variant="ghost" onPress={() => router.push("/login")} />
        <Text variant="caption" tone="muted" style={{ textAlign: "center" }} accessibilityLabel={t("brand.dedicationSr")}>{t("brand.dedication")}</Text>
      </InkIn>
    </Screen>
  );
}
